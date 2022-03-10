// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

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
        (uint256 _profit, uint256 _loss, uint256 _payback) = _generateReport();
        if (_profit > 0) {
            _convertCollateralToDrip(_profit);
            _forwardEarning();
        }
        IVesperPool(pool).reportEarning(0, _loss, _payback);
        _reinvest();
        if (!depositError) {
            uint256 depositLoss = _realizeLoss(IVesperPool(pool).totalDebtOf(address(this)));
            if (depositLoss > _loss) IVesperPool(pool).reportLoss(depositLoss - _loss);
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
