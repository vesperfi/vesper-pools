// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../MakerStrategy.sol";
import "../../Earn.sol";
import "../AaveMakerStrategy.sol";
import "../../aave/AaveCore.sol";
import "../../../interfaces/vesper/IPoolRewards.sol";

/// @dev This strategy will deposit collateral token in Maker, borrow Dai and
/// deposit borrowed DAI in Aave to earn interest.
contract EarnAaveMakerStrategy is AaveMakerStrategy, Earn {
    using SafeERC20 for IERC20;

    //solhint-disable no-empty-blocks
    constructor(
        address _pool,
        address _cm,
        address _swapManager,
        address _receiptToken,
        bytes32 _collateralType,
        address _dripToken,
        string memory _name
    ) AaveMakerStrategy(_pool, _cm, _swapManager, _receiptToken, _collateralType, _name) Earn(_dripToken) {}

    //solhint-enable no-empty-blocks

    function _claimRewardsAndConvertTo(address _toToken) internal override(Strategy, AaveMakerStrategy) {
        AaveMakerStrategy._claimRewardsAndConvertTo(_toToken);
    }

    /**
     * @dev Handle DAI profit.
     * Calculate fee in DAI, transfer fee to feeCollector and forward remaining to EarnDrip
     * @param _profit Profit in DAI
     */
    function _handleProfit(uint256 _profit) internal override {
        if (_profit > 0) {
            // Get collateral equivalent of earned DAI
            (, uint256 _collateralEarned, ) = swapManager.bestOutputFixedInput(DAI, address(collateralToken), _profit);
            // Get fee on collateralEarned
            uint256 _feeInCollateral = IVesperPool(pool).calculateUniversalFee(_collateralEarned);
            // Get DAI equivalent of _feeInCollateral
            (, uint256 _feeInDAI, ) = swapManager.bestInputFixedOutput(DAI, address(collateralToken), _feeInCollateral);
            if (_feeInDAI > 0) {
                IERC20(DAI).safeTransfer(feeCollector, _feeInDAI);
            }
            _forwardEarning();
        }
    }

    /**
     * @notice Calculate earning and convert it to drip token
     * @dev Also claim rewards if available.
     *      Withdraw excess DAI from lender.
     *      forward DAI earning(minus fee) to EarnDrip
     * @return profit in collateral token
     */
    function _realizeProfit(
        uint256 /*_totalDebt*/
    ) internal virtual override(Strategy, MakerStrategy) returns (uint256) {
        _claimRewardsAndConvertTo(dripToken);
        _rebalanceDaiInLender();
        _handleProfit(IERC20(DAI).balanceOf(address(this)));
        return collateralToken.balanceOf(address(this));
    }
}
