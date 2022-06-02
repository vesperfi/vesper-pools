// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

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

    /**
     * @dev Handle DAI profit.
     * @dev This strategy is only holding vaDAI though profit is in DAI.
     * Calculate fee in DAI, convert fee into vaDAI, transfer fee to feeCollector and forward remaining to EarnDrip
     * @param _profit Profit in DAI
     */
    function _handleProfit(uint256 _profit) internal override {
        uint256 _vAmount = (_profit * 1e18) / IVesperPool(receiptToken).pricePerShare();
        if (_vAmount > 0) {
            // Get collateral equivalent of earned DAI
            (, uint256 _collateralEarned, ) = swapManager.bestOutputFixedInput(DAI, address(collateralToken), _profit);
            // Get fee on collateralEarned
            uint256 _feeInCollateral = IVesperPool(pool).calculateUniversalFee(_collateralEarned);
            // Get DAI equivalent of _feeInCollateral
            (, uint256 _feeInDAI, ) = swapManager.bestInputFixedOutput(DAI, address(collateralToken), _feeInCollateral);

            totalEarned = totalEarned + _profit - _feeInDAI;
            // Get fee in vaDAI
            uint256 _fee = (_feeInDAI * 1e18) / IVesperPool(receiptToken).pricePerShare();
            if (_fee > 0) {
                IERC20(receiptToken).safeTransfer(feeCollector, _fee);
                // _vAmount is higher than _fee
                _vAmount = _vAmount - _fee;
            }
            // Forward earning to drip contract
            address _dripContract = IVesperPool(pool).poolRewards();
            IERC20(receiptToken).safeTransfer(_dripContract, _vAmount);
            IEarnDrip(_dripContract).notifyRewardAmount(receiptToken, _vAmount, dripPeriod);
        }
    }

    /**
     * @dev Maker strategy has DAI as drip token and vaDAI as growPool and vaDAI as receiptToken
     * with that being said, growPool and receiptToken are same.
     * @dev Overall profit can be more than _daiFromRewards, in that case we will have to withdraw
     * some from vaDAI pool. In order to avoid that, we can deposit _daiFromRewards into the pool
     * and calculated fee in vaDAI and use remaining vaDAI profit as earnDrip
     */
    function _rebalanceDaiInLender() internal override {
        // DAI balance collected from _claimRewardsAndConvertTo (VSP rewards)
        uint256 _daiFromRewards = IERC20(dripToken).balanceOf(address(this));
        if (_daiFromRewards > 0) {
            // If we have any spare DAI collected from _claimRewardsAndConvertTo
            // We want to deposit them in vPool
            IVesperPool(receiptToken).deposit(_daiFromRewards);
        }
    }

    function _realizeLoss(uint256) internal view virtual override(Strategy, MakerStrategy) returns (uint256) {
        return 0;
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
        // DAI balance deposited in vPool including DAI deposited in _rebalanceDaiInLender().
        uint256 _daiBalance = _getDaiBalance();
        // DAI debt in Maker
        uint256 _daiDebt = cm.getVaultDebt(address(this));
        if (_daiBalance > _daiDebt) {
            // If actual DAI balance in vPool has increased we want to forward this to EarnDrip
            _handleProfit(_daiBalance - _daiDebt);
        }
        return 0;
    }
}
