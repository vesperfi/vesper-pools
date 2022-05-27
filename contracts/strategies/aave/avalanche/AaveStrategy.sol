// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./AaveCore.sol";
import "../../Strategy.sol";
import "../../../interfaces/aave/IAave.sol";
import "../../../dependencies/openzeppelin/contracts/utils/math/Math.sol";

/// @dev This strategy will deposit collateral token in Aave and earn interest.
contract AaveStrategy is Strategy, AaveCore {
    using SafeERC20 for IERC20;
    // solhint-disable-next-line var-name-mixedcase
    string public NAME;
    string public constant VERSION = "4.0.1";

    constructor(
        address _pool,
        address _swapManager,
        address _receiptToken,
        string memory _name
    ) Strategy(_pool, _swapManager, _receiptToken) AaveCore(_receiptToken) {
        NAME = _name;
    }

    function isReservedToken(address _token) public view override returns (bool) {
        return _isReservedToken(_token);
    }

    /**
     * @notice Report total value
     * @dev aToken and collateral are 1:1
     */
    function totalValue() public view virtual override returns (uint256 _totalValue) {
        _totalValue = aToken.balanceOf(address(this));

        uint256 _rewardAccrued = _getRewardAccrued();
        if (_rewardAccrued > 0) {
            (, uint256 _rewardAsCollateral, ) =
                swapManager.bestOutputFixedInput(rewardToken, address(collateralToken), _rewardAccrued);
            // Total value = reward as collateral + aToken balance
            _totalValue += _rewardAsCollateral;
        }
    }

    /// @notice Large approval of token
    function _approveToken(uint256 _amount) internal override {
        collateralToken.safeApprove(pool, _amount);
        collateralToken.safeApprove(address(aaveLendingPool), _amount);
        for (uint256 i = 0; i < swapManager.N_DEX(); i++) {
            IERC20(rewardToken).safeApprove(address(swapManager.ROUTERS(i)), _amount);
        }
    }

    /**
     * @notice Transfer StakeAave to newStrategy
     * @param _newStrategy Address of newStrategy
     */
    //solhint-disable no-empty-blocks
    function _beforeMigration(address _newStrategy) internal override {}

    /// @notice Claim Aave rewards and convert to _toToken.
    function _claimRewardsAndConvertTo(address _toToken) internal override {
        uint256 _rewardAmount = _claimRewards();
        if (rewardToken != _toToken && _rewardAmount > 0) {
            _safeSwap(rewardToken, _toToken, _rewardAmount, 1);
        }
    }

    /// @notice Deposit asset into Aave
    function _deposit(uint256 _amount) internal {
        if (_amount > 0) {
            aaveLendingPool.deposit(address(collateralToken), _amount, address(this), 0);
        }
    }

    /// @notice Withdraw collateral to payback excess debt
    function _liquidate(uint256 _excessDebt) internal override returns (uint256 _payback) {
        if (_excessDebt > 0) {
            _payback = _safeWithdraw(address(this), _excessDebt);
        }
    }

    /**
     * @notice Calculate earning and withdraw it from Aave.
     * @dev If somehow we got some collateral token in strategy then we want to
     *  include those in profit. That's why we used 'return' outside 'if' condition.
     * @param _totalDebt Total collateral debt of this strategy
     * @return profit in collateral token
     */
    function _realizeProfit(uint256 _totalDebt) internal override returns (uint256) {
        _claimRewardsAndConvertTo(address(collateralToken));
        uint256 _aTokenBalance = aToken.balanceOf(address(this));
        if (_aTokenBalance > _totalDebt) {
            _withdraw(address(this), _aTokenBalance - _totalDebt);
        }
        return collateralToken.balanceOf(address(this));
    }

    /**
     * @notice Calculate realized loss.
     * @return _loss Realized loss in collateral token
     */
    function _realizeLoss(uint256 _totalDebt) internal view override returns (uint256 _loss) {
        uint256 _aTokenBalance = aToken.balanceOf(address(this));
        if (_aTokenBalance < _totalDebt) {
            _loss = _totalDebt - _aTokenBalance;
        }
    }

    /// @notice Deposit collateral in Aave
    function _reinvest() internal override {
        _deposit(collateralToken.balanceOf(address(this)));
    }

    /**
     * @notice Safe withdraw will make sure to check asking amount against available amount.
     * @dev Check we have enough aToken and liquidity to support this withdraw
     * @param _to Address that will receive collateral token.
     * @param _amount Amount of collateral to withdraw.
     * @return Actual collateral withdrawn
     */
    function _safeWithdraw(address _to, uint256 _amount) internal returns (uint256) {
        uint256 _aTokenBalance = aToken.balanceOf(address(this));
        // If Vesper becomes large liquidity provider in Aave(This happened in past in vUSDC 1.0)
        // In this case we might have more aToken compare to available liquidity in Aave and any
        // withdraw asking more than available liquidity will fail. To do safe withdraw, check
        // _amount against available liquidity.
        (uint256 _availableLiquidity, , , , , , , , , ) =
            aaveProtocolDataProvider.getReserveData(address(collateralToken));
        // Get minimum of _amount, _aTokenBalance and _availableLiquidity
        return _withdraw(_to, Math.min(_amount, Math.min(_aTokenBalance, _availableLiquidity)));
    }

    /**
     * @notice Withdraw given amount of collateral from Aave to pool
     * @param _amount Amount of collateral to withdraw.
     */
    function _withdraw(uint256 _amount) internal override {
        _safeWithdraw(pool, _amount);
    }

    /**
     * @notice Withdraw given amount of collateral from Aave to given address
     * @param _to Address that will receive collateral token.
     * @param _amount Amount of collateral to withdraw.
     * @return Actual collateral withdrawn
     */
    function _withdraw(address _to, uint256 _amount) internal returns (uint256) {
        if (_amount > 0) {
            require(
                aaveLendingPool.withdraw(address(collateralToken), _amount, _to) == _amount,
                "withdrawn-amount-is-not-correct"
            );
        }
        return _amount;
    }
}
