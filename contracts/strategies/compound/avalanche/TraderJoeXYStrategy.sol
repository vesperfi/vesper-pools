// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../CompoundXYCore.sol";
import "../../../interfaces/compound/ICompound.sol";
import "../../../interfaces/compound/IComptrollerMultiReward.sol";
import "../../../interfaces/oracle/IUniswapV3Oracle.sol";
import "../../../interfaces/token/IToken.sol";

/// @title This strategy will deposit collateral token in TraderJoe and based on position it will borrow
/// another token. Supply X borrow Y and keep borrowed amount here. It does handle rewards from TraderJoe
contract TraderJoeXYStrategy is CompoundXYCore {
    using SafeERC20 for IERC20;

    address public rewardDistributor;
    address public immutable rewardToken;
    address internal constant WAVAX = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7;

    constructor(
        address _pool,
        address _swapManager,
        address _comptroller,
        address _rewardDistributor,
        address _rewardToken,
        address _receiptToken,
        address _borrowCToken,
        string memory _name
    ) CompoundXYCore(_pool, _swapManager, _comptroller, _receiptToken, _borrowCToken, _name) {
        require(_rewardDistributor != address(0), "reward-distributor-is-null");
        require(_rewardToken != address(0), "rewardToken-address-is-zero");
        rewardDistributor = _rewardDistributor;
        rewardToken = _rewardToken;
        WETH = WAVAX;
    }

    function isReservedToken(address _token) public view virtual override returns (bool) {
        return super.isReservedToken(_token) || _token == rewardToken;
    }

    /// @notice Calculate total value based reward accrued, supply and borrow position
    function totalValue() public view virtual override returns (uint256 _totalValue) {
        _totalValue = CompoundXYCore.totalValue();
        _totalValue += _getRewardsAsCollateral(0, rewardToken); // Protocol token rewards
        _totalValue += _getRewardsAsCollateral(1, WAVAX); // AVAX rewards, optional
    }

    /// @dev Approve reward tokens to router
    function _approveRouter(address _router, uint256 _amount) internal virtual override {
        IERC20(rewardToken).safeApprove(_router, _amount);
        // Parent contract is approving collateral so skip if WAVAX is collateral.
        if (address(collateralToken) != WAVAX) {
            IERC20(WAVAX).safeApprove(_router, _amount);
        }
    }

    /// @dev NOTICE:: Not calling parent function as parent will call claimComp, which will fail.
    function _claimRewardsAndConvertTo(address _toToken) internal virtual override {
        ComptrollerMultiReward(address(comptroller)).claimReward(0, address(this)); // Claim protocol rewards
        ComptrollerMultiReward(address(comptroller)).claimReward(1, address(this)); // Claim native AVAX (optional)

        uint256 _rewardAmount = IERC20(rewardToken).balanceOf(address(this));
        if (_rewardAmount > 0) {
            _safeSwap(rewardToken, _toToken, _rewardAmount, 1);
        }
        uint256 _avaxRewardAmount = address(this).balance;
        if (_avaxRewardAmount > 0) {
            TokenLike(WAVAX).deposit{value: _avaxRewardAmount}();
            _safeSwap(WAVAX, _toToken, _avaxRewardAmount, 1);
        }
    }

    /// @dev TraderJoe Compound fork has different markets API so allow this method to override.
    function _getCollateralFactor(address _cToken) internal view override returns (uint256 _collateralFactor) {
        (, _collateralFactor, ) = TraderJoeComptroller(address(comptroller)).markets(_cToken);
    }

    function _getRewardsAsCollateral(uint8 rewardType_, address rewardToken_)
        internal
        view
        returns (uint256 _rewardsAsCollateral)
    {
        uint256 _rewardsAccrued = IRewardDistributor(rewardDistributor).rewardAccrued(rewardType_, address(this));
        if (address(collateralToken) == rewardToken_) {
            return _rewardsAccrued;
        }

        if (_rewardsAccrued > 0) {
            (, _rewardsAsCollateral, ) = swapManager.bestOutputFixedInput(
                rewardToken_,
                address(collateralToken),
                _rewardsAccrued
            );
        }
    }
}
