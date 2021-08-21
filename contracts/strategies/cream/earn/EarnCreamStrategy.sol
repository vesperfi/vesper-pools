// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "../CreamStrategy.sol";
import "../../Earn.sol";
import "../../../interfaces/vesper/IPoolRewards.sol";

/// @title This strategy will deposit collateral token in C.R.E.A.M. and earn drip in an another token.
abstract contract EarnCreamStrategy is CreamStrategy, Earn {
    using SafeERC20 for IERC20;

    // solhint-disable no-empty-blocks
    constructor(
        address _pool,
        address _swapManager,
        address _receiptToken,
        address _dripToken
    ) CreamStrategy(_pool, _swapManager, _receiptToken) Earn(_dripToken) {}

    // solhint-enable no-empty-blocks

    function totalValueCurrent() external virtual override(Strategy, CompoundStrategy) returns (uint256 _totalValue) {
        _totalValue = totalValue();
    }

    function _setupOracles() internal override(Strategy, CompoundStrategy) {
        CompoundStrategy._setupOracles();
    }

    function _claimRewardsAndConvertTo(address _toToken) internal override(Strategy, CompoundStrategy) {
        CompoundStrategy._claimRewardsAndConvertTo(_toToken);
    }

    function _realizeProfit(uint256 _totalDebt) internal virtual override(Strategy, CreamStrategy) returns (uint256) {
        uint256 _collateralBalance = _convertToCollateral(cToken.balanceOf(address(this)));
        if (_collateralBalance > _totalDebt) {
            _withdrawHere(_collateralBalance - _totalDebt);
        }
        _convertCollateralToDrip();
        _forwardEarning(dripToken, feeCollector, pool);
        return 0;
    }

    /// @notice Approve all required tokens
    function _approveToken(uint256 _amount) internal virtual override(Strategy, CreamStrategy) {
        collateralToken.safeApprove(pool, _amount);
        collateralToken.safeApprove(address(cToken), _amount);
        for (uint256 i = 0; i < swapManager.N_DEX(); i++) {
            collateralToken.safeApprove(address(swapManager.ROUTERS(i)), _amount);
        }
    }
}
