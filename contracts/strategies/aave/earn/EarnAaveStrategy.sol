// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "../AaveStrategy.sol";
import "../../Earn.sol";
import "../../../interfaces/vesper/IPoolRewards.sol";

/// @title This strategy will deposit collateral token in Aave and earn drip in an another token.
contract EarnAaveStrategy is AaveStrategy, Earn {
    using SafeERC20 for IERC20;

    // solhint-disable no-empty-blocks
    constructor(
        address _pool,
        address _swapManager,
        address _receiptToken,
        address _dripToken,
        string memory _strategyName
    ) AaveStrategy(_pool, _swapManager, _receiptToken, _strategyName) Earn(_dripToken) {}

    // solhint-enable no-empty-blocks

    function _setupOracles() internal override(Strategy, AaveStrategy) {
        AaveStrategy._setupOracles();
    }

    function _claimRewardsAndConvertTo(address _toToken) internal override(Strategy, AaveStrategy) {
        AaveStrategy._claimRewardsAndConvertTo(_toToken);
    }

    function _realizeProfit(uint256 _totalDebt) internal virtual override(Strategy, AaveStrategy) returns (uint256) {
        _claimRewardsAndConvertTo(address(collateralToken));
        uint256 _aTokenBalance = aToken.balanceOf(address(this));
        if (_aTokenBalance > _totalDebt) {
            _withdraw(address(collateralToken), address(this), _aTokenBalance - _totalDebt);
        }
        // Any collateral here is profit
        _handleProfit(collateralToken.balanceOf(address(this)));
        return 0;
    }

    /// @notice Approve all required tokens
    function _approveToken(uint256 _amount) internal virtual override(Strategy, AaveStrategy) {
        collateralToken.safeApprove(pool, _amount);
        collateralToken.safeApprove(address(aaveLendingPool), _amount);
        for (uint256 i = 0; i < swapManager.N_DEX(); i++) {
            IERC20(AAVE).safeApprove(address(swapManager.ROUTERS(i)), _amount);
            collateralToken.safeApprove(address(swapManager.ROUTERS(i)), _amount);
        }
    }
}
