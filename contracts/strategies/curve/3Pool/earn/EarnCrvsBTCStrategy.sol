// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "../CrvsBTCPoolStrategy.sol";
import "../../../Earn.sol";

//solhint-disable no-empty-blocks
contract EarnCrvsBTCStrategy is CrvsBTCPoolStrategy, Earn {
    using SafeERC20 for IERC20;

    constructor(
        address _pool,
        address _swapManager,
        address _dripToken
    ) CrvsBTCPoolStrategy(_pool, _swapManager, 1) Earn(_dripToken) {}

    function rebalance() external override(Strategy, Crv3PoolStrategyBase) onlyKeeper {
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

    function convertFrom18(uint256 amount) public pure override(Strategy, CrvsBTCPoolStrategy) returns (uint256) {
        return CrvsBTCPoolStrategy.convertFrom18(amount);
    }

    function _claimRewardsAndConvertTo(address _toToken) internal override(Strategy, Crv3PoolStrategyBase) {
        Crv3PoolStrategyBase._claimRewardsAndConvertTo(_toToken);
    }

    function _setupOracles() internal override(Strategy, CrvsBTCPoolStrategy) {
        CrvsBTCPoolStrategy._setupOracles();
    }

    function _generateReport()
        internal
        override(Strategy, Crv3PoolStrategyBase)
        returns (
            uint256 _profit,
            uint256 _loss,
            uint256 _payback
        )
    {
        return Crv3PoolStrategyBase._generateReport();
    }

    /// @notice Approve all required tokens
    function _approveToken(uint256 _amount) internal virtual override(Strategy, Crv3PoolStrategyBase) {
        collateralToken.safeApprove(pool, _amount);
        collateralToken.safeApprove(address(crvPool), _amount);
        for (uint256 i = 0; i < swapManager.N_DEX(); i++) {
            IERC20(CRV).safeApprove(address(swapManager.ROUTERS(i)), _amount);
            collateralToken.safeApprove(address(swapManager.ROUTERS(i)), _amount);
        }
        IERC20(crvLp).safeApprove(crvGauge, _amount);
    }
}
