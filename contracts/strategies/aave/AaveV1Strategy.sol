// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../../interfaces/aave/IAaveV1.sol";
import "../Strategy.sol";

/// @dev This strategy will deposit collateral token in Aave and earn interest.
contract AaveV1Strategy is Strategy {
    using SafeERC20 for IERC20;

    // solhint-disable-next-line var-name-mixedcase
    string public NAME;
    string public constant VERSION = "4.0.0";

    AaveAddressesProvider public aaveAddressesProvider =
        AaveAddressesProvider(0x24a42fD28C976A61Df5D00D0599C34c4f90748c8);
    AavePool public immutable aaveLendingPool;
    AavePoolCore public immutable aaveLendingPoolCore;

    AToken internal immutable aToken;

    constructor(
        address _pool,
        address _swapManager,
        address _receiptToken,
        string memory _name
    ) Strategy(_pool, _swapManager, _receiptToken) {
        require(_receiptToken != address(0), "aToken-address-is-zero");
        aToken = AToken(_receiptToken);
        aaveLendingPool = AavePool(aaveAddressesProvider.getLendingPool());
        aaveLendingPoolCore = AavePoolCore(aaveAddressesProvider.getLendingPoolCore());
        NAME = _name;
    }

    /**
     * @notice Report total value
     * @dev aToken and collateral are 1:1 so total aTokens are totalValue
     */
    function totalValue() public view virtual override returns (uint256) {
        return aToken.balanceOf(address(this));
    }

    function isReservedToken(address _token) public view override returns (bool) {
        return _token == address(aToken);
    }

    /// @notice Large approval of token
    function _approveToken(uint256 _amount) internal override {
        collateralToken.safeApprove(pool, _amount);
        collateralToken.safeApprove(address(aaveLendingPoolCore), _amount);
    }

    /// @notice No action needed before migration
    //solhint-disable no-empty-blocks
    function _beforeMigration(address _newStrategy) internal override {}

    /// @notice Deposit asset into Aave
    function _deposit(address _asset, uint256 _amount) internal {
        if (_amount != 0) {
            aaveLendingPool.deposit(_asset, _amount, 0);
        }
    }

    /// @notice Withdraw collateral to payback excess debt
    function _liquidate(uint256 _excessDebt) internal override returns (uint256 _payback) {
        if (_excessDebt != 0) {
            _payback = _safeWithdraw(_excessDebt);
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
        uint256 _aTokenBalance = aToken.balanceOf(address(this));
        if (_aTokenBalance > _totalDebt) {
            _withdrawHere(_aTokenBalance - _totalDebt);
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
        _deposit(address(collateralToken), collateralToken.balanceOf(address(this)));
    }

    /**
     * @notice Withdraw given amount of collateral from Aave to pool
     * @param _amount Amount of collateral to withdraw.
     */
    function _withdraw(uint256 _amount) internal override {
        _safeWithdraw(_amount);
        collateralToken.safeTransfer(pool, collateralToken.balanceOf(address(this)));
    }

    /**
     * @notice Safe withdraw will make sure to check asking amount against available amount.
     * @dev Check we have enough aToken and liquidity to support this withdraw
     * @param _amount Amount of collateral to withdraw.
     * @return Actual collateral withdrawn
     */
    function _safeWithdraw(uint256 _amount) internal returns (uint256) {
        uint256 _aTokenBalance = aToken.balanceOf(address(this));
        // If Vesper becomes large liquidity provider in Aave(This happened in past in vUSDC 1.0)
        // In this case we might have more aToken compare to available liquidity in Aave and any
        // withdraw asking more than available liquidity will fail. To do safe withdraw, check
        // _amount against available liquidity.
        uint256 _availableLiquidity = aaveLendingPoolCore.getReserveAvailableLiquidity(address(collateralToken));
        // Get minimum of _amount, _aTokenBalance and _availableLiquidity
        return _withdrawHere(_min(_amount, _min(_aTokenBalance, _availableLiquidity)));
    }

    /**
     * @notice Withdraw given amount of collateral from Aave
     * @param _amount Amount of collateral to withdraw.
     * @return Actual collateral withdrawn
     */
    function _withdrawHere(uint256 _amount) internal returns (uint256) {
        if (_amount != 0) {
            aToken.redeem(_amount);
        }
        return _amount;
    }

    /// @notice Returns minimum of 2 given numbers
    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
