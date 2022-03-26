// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "../VesperMakerStrategy.sol";
import "../../Earn.sol";

/// @dev This strategy will deposit collateral token in Maker, borrow Dai and
/// deposit borrowed DAI in Vesper pool to earn interest.
contract EarnVesperMakerStrategy is VesperMakerStrategy, Earn {
    using SafeERC20 for IERC20;

    constructor(
        address _pool,
        address _cm,
        address _swapManager,
        address _vPool,
        bytes32 _collateralType,
        address _dripToken,
        string memory _name
    ) VesperMakerStrategy(_pool, _cm, _swapManager, _vPool, _collateralType, _name) Earn(_dripToken) {
        require(address(IVesperPool(_vPool).token()) == DAI, "not-a-valid-dai-pool");
        address _dripContract = IVesperPool(_pool).poolRewards();
        address _growPool = IEarnDrip(_dripContract).growToken();
        // underlying vPool of MakerStrategy must be equal to the growToken
        // Otherwise we cannot forward earnings without withdrawing/redepositing first
        // Example: Underlying vPool is vDAI v2 and growToken is vDAI v3 won't work
        require(receiptToken == _growPool, "not-a-valid-grow-pool");
    }

    function _claimRewardsAndConvertTo(address _toToken) internal override(Strategy, VesperMakerStrategy) {
        VesperMakerStrategy._claimRewardsAndConvertTo(_toToken);
    }

    /// @dev Maker strategy has DAI as drip token and vaDAI as growPool and vaDAI as receiptToken
    /// with that being said, growPool and receiptToken are same.
    function _rebalanceDaiInLender() internal override {
        // DAI balance collected from _claimRewardsAndConvertTo (VSP rewards)
        uint256 _daiFromRewards = IERC20(dripToken).balanceOf(address(this));

        if (_daiFromRewards > 0) {
            // If we have any spare DAI collected from _claimRewardsAndConvertTo
            // We want to deposit them in vPool
            IVesperPool(receiptToken).deposit(_daiFromRewards);
        }

        // DAI balance deposited in vPool including above deposited amount.
        uint256 _daiBalance = _getDaiBalance();
        // DAI debt in Maker
        uint256 _daiDebt = cm.getVaultDebt(address(this));

        if (_daiBalance > _daiDebt) {
            // If actual DAI balance in vPool has increased we want to forward this to EarnDrip
            uint256 _daiEarned = _daiBalance - _daiDebt;
            uint256 _vAmount = (_daiEarned * 1e18) / IVesperPool(receiptToken).pricePerShare();

            if (_vAmount > 0) {
                // Get collateral equivalent of _daiEarned
                (, uint256 _collateralEarned, ) =
                    swapManager.bestOutputFixedInput(DAI, address(collateralToken), _daiEarned);
                // Get fee on collateralEarned
                uint256 _feeInCollateral = IVesperPool(pool).calculateUniversalFee(_collateralEarned);
                // Get DAI equivalent of _feeInCollateral
                (, uint256 _feeInDAI, ) =
                    swapManager.bestInputFixedOutput(DAI, address(collateralToken), _feeInCollateral);
                totalEarned = totalEarned + _daiEarned - _feeInDAI;
                // Get fee in vaDAI
                uint256 _fee = (_feeInDAI * 1e18) / IVesperPool(receiptToken).pricePerShare();
                if (_fee > 0) {
                    IERC20(receiptToken).safeTransfer(feeCollector, _fee);
                    // _vAmount is higher than _fee
                    _vAmount = _vAmount - _fee;
                }
                address _dripContract = IVesperPool(pool).poolRewards();
                IERC20(receiptToken).safeTransfer(_dripContract, _vAmount);
                IEarnDrip(_dripContract).notifyRewardAmount(receiptToken, _vAmount, dripPeriod);
            }
        }
    }

    /**
     * @dev ClaimRewards and calculate profit. Forward profit, after fee, to EarnDrip.
     * @return profit in collateral token
     */
    function _realizeProfit(
        uint256 /*_totalDebt*/
    ) internal virtual override(Strategy, MakerStrategy) returns (uint256) {
        _claimRewardsAndConvertTo(dripToken);
        _rebalanceDaiInLender();
        return 0;
    }
}
