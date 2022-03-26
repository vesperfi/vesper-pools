// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./EarnVesperStrategy.sol";

// solhint-disable no-empty-blocks
/// @title Earn Vesper Strategy adjusted for vVSP timelock
contract EarnVesperStrategyVSPDrip is EarnVesperStrategy {
    using SafeERC20 for IERC20;

    bool public transferToDripContract = false;

    constructor(
        address _pool,
        address _swapManager,
        address _receiptToken,
        address _dripToken,
        address _vsp,
        string memory _name
    ) EarnVesperStrategy(_pool, _swapManager, _receiptToken, _dripToken, _vsp, _name) {}

    /// @dev Empty implementation, VSP rewards don't need to be converted.
    function _claimRewardsAndConvertTo(address _toToken) internal virtual override {}

    /// @dev Send this earning to drip contract.
    function _forwardEarning() internal override {
        address _dripContract = IVesperPool(pool).poolRewards();
        uint256 _earned = IERC20(dripToken).balanceOf(address(this));
        // Fetches which rewardToken collects the drip
        address _growPool = IEarnDrip(_dripContract).growToken();
        // Checks that the Grow Pool supports dripToken as underlying
        require(address(IVesperPool(_growPool).token()) == dripToken, "invalid-grow-pool");

        if (!transferToDripContract && _earned > 0) {
            totalEarned += _earned;
            IVesperPool(_growPool).deposit(_earned);

            // Next rebalance call will transfer to dripContract
            transferToDripContract = true;
        } else if (transferToDripContract) {
            uint256 _growPoolBalance = IERC20(_growPool).balanceOf(address(this));
            IERC20(_growPool).safeTransfer(_dripContract, _growPoolBalance);
            IEarnDrip(_dripContract).notifyRewardAmount(_growPool, _growPoolBalance, dripPeriod);

            // Next rebalance call will deposit VSP to vVSP Pool
            transferToDripContract = false;
        }
    }

    /** @dev Handle collateral and VSP profit. Here dripToken is VSP
     *      Convert collateral profit into VSP
     *      Calculate fee on profit.
     *      Transfer fee to feeCollector
     *      Forward VSP earning to EarnDrip
     * @param _profit Profit in collateral
     */
    function _handleProfit(uint256 _profit) internal override {
        // There may be some profit in collateral, convert those to VSP
        _convertCollateralToDrip(_profit);
        // Profit in drip token
        uint256 _profitInVSP = IERC20(dripToken).balanceOf(address(this));
        if (_profitInVSP > 0) {
            // Get collateral equivalent of earned VSP
            (, uint256 _collateralEarned, ) =
                swapManager.bestOutputFixedInput(dripToken, address(collateralToken), _profitInVSP);
            // Get fee on collateralEarned
            uint256 _feeInCollateral = IVesperPool(pool).calculateUniversalFee(_collateralEarned);
            // Get VSP equivalent of _feeInCollateral
            (, uint256 _feeInVSP, ) =
                swapManager.bestInputFixedOutput(dripToken, address(collateralToken), _feeInCollateral);

            if (_feeInVSP > 0) {
                IERC20(dripToken).safeTransfer(feeCollector, _feeInVSP);
            }
            _forwardEarning();
        }
    }
}
