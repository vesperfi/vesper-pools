// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./CompoundXYStrategy.sol";
import "../../interfaces/compound/IComptrollerMultiReward.sol";
import "../../interfaces/vesper/IVesperPool.sol";
import "../../interfaces/vesper/IPoolRewards.sol";

/// @title This strategy will deposit collateral token in Benqi and based on position it will borrow
/// another token. Supply X borrow Y and keep borrowed amount here. It does handle rewards and handle
/// wrap/unwrap of WETH as ETH is required to interact with Benqi.
contract BenqiXYStrategy is CompoundXYStrategy {
    using SafeERC20 for IERC20;

    address public rewardDistributor;
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
    ) CompoundXYStrategy(_pool, _swapManager, _comptroller, _rewardToken, _receiptToken, _borrowCToken, _name) {
        require(_rewardDistributor != address(0), "reward-distributor-is-null");
        rewardDistributor = _rewardDistributor;
        WETH = WAVAX;
    }

    /// @notice Calculate total value based reward accrued (COMP and VSP), supply and borrow position
    function totalValue() public view virtual override returns (uint256 _totalValue) {
        _totalValue = CompoundXYCore.totalValue();
        _totalValue += _getRewardsAsCollateral(0, rewardToken); // Protocol token rewards
        _totalValue += _getRewardsAsCollateral(1, WAVAX); // AVAX rewards, optional
    }

    function _approveRouter(address _router, uint256 _amount) internal virtual override {
        // Parent contract is approving reward token, so calling parent function
        super._approveRouter(_router, _amount);
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
            // High chance WAVAX can be _toToken
            if (_toToken != WAVAX) {
                _safeSwap(WAVAX, _toToken, _avaxRewardAmount, 1);
            }
        }
    }

    function _getRewardsAsCollateral(uint8 rewardType_, address rewardToken_)
        internal
        view
        returns (uint256 _rewardsAsCollateral)
    {
        uint256 _rewardsAccrued = IRewardDistributor(rewardDistributor).rewardAccrued(rewardType_, address(this));

        if (address(collateralToken) != rewardToken_ && _rewardsAccrued > 0) {
            (, _rewardsAsCollateral, ) = swapManager.bestOutputFixedInput(
                rewardToken_,
                address(collateralToken),
                _rewardsAccrued
            );
        }
    }
}
