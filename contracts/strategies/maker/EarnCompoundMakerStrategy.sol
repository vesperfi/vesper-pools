// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./MakerStrategy.sol";
import "../Earn.sol";
import "./CompoundMakerStrategy.sol";
import "../aave/AaveCore.sol";
import "../../interfaces/vesper/IPoolRewards.sol";

/// @dev This strategy will deposit collateral token in Maker, borrow Dai and
/// deposit borrowed DAI in Aave to earn interest.
abstract contract EarnCompoundMakerStrategy is CompoundMakerStrategy, Earn {
    //solhint-disable no-empty-blocks
    constructor(
        address _pool,
        address _cm,
        address _swapManager,
        address _receiptToken,
        bytes32 _collateralType,
        address _dripToken
    ) CompoundMakerStrategy(_pool, _cm, _swapManager, _receiptToken, _collateralType) Earn(_dripToken) {}

    function totalValueCurrent() public override(Strategy, CompoundMakerStrategy) returns (uint256 _totalValue) {
        _claimComp();
        _totalValue = _calculateTotalValue(IERC20(COMP).balanceOf(address(this)));
    }

    function _claimRewardsAndConvertTo(address _toToken) internal override(Strategy, CompoundMakerStrategy) {
        CompoundMakerStrategy._claimRewardsAndConvertTo(_toToken);
    }

    /**
     * @notice Calculate earning and convert it to collateral token
     * @dev Also claim rewards if available.
     *      Withdraw excess DAI from lender.
     *      Swap net earned DAI to collateral token
     * @return profit in collateral token
     */
    function _realizeProfit(
        uint256 /*_totalDebt*/
    ) internal virtual override(Strategy, MakerStrategy) returns (uint256) {
        _claimRewardsAndConvertTo(dripToken);
        _rebalanceDaiInLender();
        _forwardEarning();
        return collateralToken.balanceOf(address(this));
    }
}
