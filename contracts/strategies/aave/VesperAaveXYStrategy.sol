// SPDX-License-Identifier: GNU LGPLv3

pragma solidity 0.8.9;

import "./AaveXYStrategy.sol";
import "../../interfaces/vesper/IVesperPool.sol";

/// @title Deposit Collateral in Aave and earn interest by depositing borrowed token in a Vesper Pool.
contract VesperAaveXYStrategy is AaveXYStrategy {
    using SafeERC20 for IERC20;

    // Destination Grow Pool for borrowed Token
    address public immutable vPool;
    // VSP token address
    address public immutable vsp;

    constructor(
        address _pool,
        address _swapManager,
        address _rewardToken,
        address _receiptToken,
        address _borrowToken,
        address _vPool,
        address _vspAddress,
        string memory _name
    ) AaveXYStrategy(_pool, _swapManager, _rewardToken, _receiptToken, _borrowToken, _name) {
        require(_vspAddress != address(0), "invalid-vsp-address");
        require(address(IVesperPool(_vPool).token()) == borrowToken, "invalid-grow-pool");
        vPool = _vPool;
        vsp = _vspAddress;
    }

    function totalValue() public view virtual override returns (uint256 _totalValue) {
        uint256 _vspAsCollateral;
        address _poolRewards = IVesperPool(vPool).poolRewards();
        if (_poolRewards != address(0)) {
            (, uint256[] memory _claimableAmount) = IPoolRewards(_poolRewards).claimable(address(this));
            uint256 _vspRewardAccrued = _claimableAmount[0];
            if (_vspRewardAccrued != 0) {
                (, _vspAsCollateral, ) = swapManager.bestOutputFixedInput(
                    vsp,
                    address(collateralToken),
                    _vspRewardAccrued
                );
            }
        }
        _totalValue = super.totalValue() + _vspAsCollateral;
    }

    /// @notice After borrowing Y, deposit to Vesper Pool
    function _afterBorrowY(uint256 _amount) internal virtual override {
        IVesperPool(vPool).deposit(_amount);
    }

    /// @notice Approve all required tokens
    function _approveToken(uint256 _amount) internal virtual override {
        super._approveToken(_amount);
        IERC20(borrowToken).safeApprove(vPool, _amount);
        for (uint256 i = 0; i < swapManager.N_DEX(); i++) {
            IERC20(vsp).safeApprove(address(swapManager.ROUTERS(i)), _amount);
        }
    }

    /// @notice Before repaying Y, withdraw it from Vesper Pool
    function _beforeRepayY(uint256 _amount) internal virtual override returns (uint256 _withdrawnAmount) {
        _withdrawFromVesperPool(_amount);
        _withdrawnAmount = IERC20(borrowToken).balanceOf(address(this));
    }

    /// @notice Claim Aave and VSP rewards and convert to _toToken.
    function _claimRewardsAndConvertTo(address _toToken) internal virtual override {
        super._claimRewardsAndConvertTo(_toToken);
        address _poolRewards = IVesperPool(vPool).poolRewards();
        if (_poolRewards != address(0)) {
            IPoolRewards(_poolRewards).claimReward(address(this));
            uint256 _vspAmount = IERC20(vsp).balanceOf(address(this));
            if (_vspAmount != 0) {
                _safeSwap(vsp, _toToken, _vspAmount, 1);
            }
        }
    }

    /// @notice Borrowed Y balance deposited in Vesper Pool
    function _getInvestedBorrowBalance() internal view virtual override returns (uint256) {
        return
            IERC20(borrowToken).balanceOf(address(this)) +
            ((IVesperPool(vPool).pricePerShare() * IVesperPool(vPool).balanceOf(address(this))) / 1e18);
    }

    /// @notice Swap excess borrow for more collateral when underlying VSP pool is making profits
    function _rebalanceBorrow(uint256 _excessBorrow) internal virtual override {
        if (_excessBorrow != 0) {
            _withdrawFromVesperPool(_excessBorrow);
            uint256 _borrowedHere = IERC20(borrowToken).balanceOf(address(this));
            if (_borrowedHere != 0) {
                _safeSwap(borrowToken, address(collateralToken), _borrowedHere);
            }
        }
    }

    /// @notice Withdraw _shares proportional to collateral _amount from vPool
    function _withdrawFromVesperPool(uint256 _amount) internal {
        if (_amount > 0) {
            uint256 _pricePerShare = IVesperPool(vPool).pricePerShare();
            uint256 _shares = (_amount * 1e18) / _pricePerShare;
            _shares = _amount > ((_shares * _pricePerShare) / 1e18) ? _shares + 1 : _shares;

            uint256 _maxShares = IERC20(vPool).balanceOf(address(this));

            IVesperPool(vPool).withdraw((_shares > _maxShares || _shares == 0) ? _maxShares : _shares);
        }
    }
}
