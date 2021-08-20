// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "../ConvexStrategy.sol";
import "../../VFR.sol";

// solhint-disable no-empty-blocks
abstract contract ConvexCoverageStrategy is ConvexStrategy, VFR {
    constructor(
        address _pool,
        address _threePool,
        address _threeCrv,
        address _gauge,
        address _swapManager,
        uint256 _collateralIdx,
        uint256 _convexPoolId
    ) ConvexStrategy(_pool, _threePool, _threeCrv, _gauge, _swapManager, _collateralIdx, _convexPoolId) {}

    function _realizeGross(uint256 _totalDebt)
        internal
        override
        returns (
            uint256 _profit,
            uint256 _loss,
            uint256 _toUnstake
        )
    {
        (_profit, _loss, _toUnstake) = super._realizeGross(_totalDebt);
        _profit = _handleCoverageProfit(pool, _profit);
    }

    function _transferProfit(
        IERC20 _token,
        address _to,
        uint256 _amount
    ) internal override returns (uint256) {
        uint256 available = _token.balanceOf(address(this));
        if (available < _amount) {
            // If the amount we have available in collateral token is not enough,
            // then fetch additional profits (which are not readily available in
            // the collateral token)
            _unstakeAndWithdrawAsCollateral(_amount - available);
            uint256 balance = _token.balanceOf(address(this));
            available = balance > _amount ? _amount : balance;
        }
        return super._transferProfit(_token, _to, available);
    }
}
