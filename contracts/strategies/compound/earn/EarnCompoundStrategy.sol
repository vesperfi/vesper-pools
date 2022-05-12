// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../CompoundStrategy.sol";
import "../../Earn.sol";
import "../../../interfaces/vesper/IPoolRewards.sol";

/// @title This strategy will deposit collateral token in Compound and earn drip in an another token.
contract EarnCompoundStrategy is CompoundStrategy, Earn {
    using SafeERC20 for IERC20;

    // solhint-disable no-empty-blocks
    constructor(
        address _pool,
        address _swapManager,
        address _comptroller,
        address _rewardToken,
        address _receiptToken,
        address _dripToken,
        string memory _name
    ) CompoundStrategy(_pool, _swapManager, _comptroller, _rewardToken, _receiptToken, _name) Earn(_dripToken) {}

    // solhint-enable no-empty-blocks

    function totalValueCurrent() public virtual override(Strategy, CompoundStrategy) returns (uint256 _totalValue) {
        _totalValue = CompoundStrategy.totalValueCurrent();
    }

    function _setupOracles() internal override(Strategy, CompoundStrategy) {
        CompoundStrategy._setupOracles();
    }

    function _claimRewardsAndConvertTo(address _toToken) internal override(Strategy, CompoundStrategy) {
        CompoundStrategy._claimRewardsAndConvertTo(_toToken);
    }

    function _realizeProfit(uint256 _totalDebt)
        internal
        virtual
        override(Strategy, CompoundStrategy)
        returns (uint256)
    {
        _claimRewardsAndConvertTo(address(collateralToken));
        uint256 _collateralBalance = _convertToCollateral(cToken.balanceOf(address(this)));
        if (_collateralBalance > _totalDebt) {
            _withdrawHere(_collateralBalance - _totalDebt);
        }
        // Any collateral here is profit
        _handleProfit(collateralToken.balanceOf(address(this)));
        return 0;
    }

    /// @notice Approve all required tokens
    function _approveToken(uint256 _amount) internal virtual override(Strategy, CompoundStrategy) {
        collateralToken.safeApprove(pool, _amount);
        collateralToken.safeApprove(address(cToken), _amount);
        for (uint256 i = 0; i < swapManager.N_DEX(); i++) {
            if (rewardToken != address(0)) IERC20(rewardToken).safeApprove(address(swapManager.ROUTERS(i)), _amount);

            collateralToken.safeApprove(address(swapManager.ROUTERS(i)), _amount);
        }
    }
}
