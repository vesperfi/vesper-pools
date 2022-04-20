// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../AlphaLendStrategy.sol";
import "../../Earn.sol";

/// @title This strategy will deposit collateral token in Alpha Homora and earn drip in an another token.
contract EarnAlphaLendStrategy is AlphaLendStrategy, Earn {
    using SafeERC20 for IERC20;

    // solhint-disable no-empty-blocks
    constructor(
        address _pool,
        address _swapManager,
        address _receiptToken,
        address _dripToken,
        string memory _name
    ) AlphaLendStrategy(_pool, _swapManager, _receiptToken, _name) Earn(_dripToken) {}

    function _setupOracles() internal override(Strategy, AlphaLendStrategy) {
        AlphaLendStrategy._setupOracles();
    }

    function _claimRewardsAndConvertTo(address _toToken) internal override(Strategy, AlphaLendStrategy) {
        AlphaLendStrategy._claimRewardsAndConvertTo(_toToken);
    }

    function _realizeProfit(uint256 _totalDebt)
        internal
        virtual
        override(Strategy, AlphaLendStrategy)
        returns (uint256)
    {
        _claimRewardsAndConvertTo(address(collateralToken));
        uint256 _collateralBalance = _convertToCollateral(safeBox.balanceOf(address(this)));
        if (_collateralBalance > _totalDebt) {
            _withdrawHere(_collateralBalance - _totalDebt);
        }
        // Any collateral here is profit
        _handleProfit(collateralToken.balanceOf(address(this)));
        return 0;
    }

    /// @notice Approve all required tokens
    function _approveToken(uint256 _amount) internal override(Strategy, AlphaLendStrategy) {
        collateralToken.safeApprove(pool, _amount);
        collateralToken.safeApprove(address(safeBox), _amount);
        for (uint256 i = 0; i < swapManager.N_DEX(); i++) {
            IERC20(alpha).safeApprove(address(swapManager.ROUTERS(i)), _amount);
            collateralToken.safeApprove(address(swapManager.ROUTERS(i)), _amount);
        }
    }
}
