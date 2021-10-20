// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "../YearnStrategy.sol";
import "../../Earn.sol";

/// @title This strategy will deposit collateral token in Yearn and earn drip in an another token.
abstract contract EarnYearnStrategy is YearnStrategy, Earn {
    using SafeERC20 for IERC20;

    // solhint-disable no-empty-blocks
    constructor(
        address _pool,
        address _swapManager,
        address _receiptToken,
        address _dripToken
    ) YearnStrategy(_pool, _swapManager, _receiptToken) Earn(_dripToken) {}

    function _realizeProfit(uint256 _totalDebt) internal virtual override(Strategy, YearnStrategy) returns (uint256) {
        uint256 _collateralBalance = _getCollateralBalance();
        if (_collateralBalance > _totalDebt) {
            _withdrawHere(_collateralBalance - _totalDebt);
        }
        _convertCollateralToDrip();
        _forwardEarning();
        return 0;
    }

    /// @notice Approve all required tokens
    function _approveToken(uint256 _amount) internal override(Strategy, YearnStrategy) {
        YearnStrategy._approveToken(_amount);
        for (uint256 i = 0; i < swapManager.N_DEX(); i++) {
            collateralToken.safeApprove(address(swapManager.ROUTERS(i)), _amount);
        }
    }
}
