// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../CrvSBTCPoolStrategy.sol";
import "../../../Earn.sol";

//solhint-disable no-empty-blocks
contract EarnCrvSBTCPoolStrategy is CrvSBTCPoolStrategy, Earn {
    using SafeERC20 for IERC20;

    constructor(
        address _pool,
        address _swapManager,
        address _dripToken,
        string memory _name
    ) CrvSBTCPoolStrategy(_pool, _swapManager, 1, _name) Earn(_dripToken) {}

    function rebalance() external override(Strategy, CrvPoolStrategyBase) onlyKeeper {
        (uint256 _profit, , uint256 _payback) = _generateReport();
        _handleProfit(_profit);
        IVesperPool(pool).reportEarning(0, 0, _payback);
        _reinvest();
        if (!depositError) {
            uint256 _depositLoss = _realizeLoss(IVesperPool(pool).totalDebtOf(address(this)));
            IVesperPool(pool).reportLoss(_depositLoss);
        }
    }

    function _claimRewardsAndConvertTo(address _toToken) internal override(Strategy, CrvPoolStrategyBase) {
        CrvPoolStrategyBase._claimRewardsAndConvertTo(_toToken);
    }

    function _setupOracles() internal override(Strategy, CrvPoolStrategyBase) {
        CrvPoolStrategyBase._setupOracles();
    }

    function _generateReport()
        internal
        override(Strategy, CrvPoolStrategyBase)
        returns (
            uint256 _profit,
            uint256 _loss,
            uint256 _payback
        )
    {
        return CrvPoolStrategyBase._generateReport();
    }
}
