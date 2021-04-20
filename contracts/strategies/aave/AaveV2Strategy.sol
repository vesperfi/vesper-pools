// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../Strategy.sol";
import "../../interfaces/aave/IAaveV2.sol";
import "../../interfaces/vesper/IVesperPool.sol";
import "../../interfaces/uniswap/IUniswapV2Router02.sol";

/// @dev This strategy will deposit collateral token in Aave and earn interest.
abstract contract AaveV2Strategy is Strategy {
    using SafeERC20 for IERC20;

    AaveLendingPoolAddressesProvider public aaveAddressesProvider =
        AaveLendingPoolAddressesProvider(0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5);
    AaveLendingPool public aaveLendingPool;
    AaveProtocolDataProvider public aaveProtocolDataProvider;

    IERC20 internal immutable aToken;
    uint256 internal collateralInvested;
    bytes32 private constant AAVE_PROVIDER_ID = 0x0100000000000000000000000000000000000000000000000000000000000000;
    event UpdatedAddressesProvider(address _previousProvider, address _newProvider);

    constructor(address _pool, address _receiptToken) Strategy(_pool, _receiptToken) {
        require(_receiptToken != address(0), "aToken-is-zero-address");
        aToken = IERC20(_receiptToken);
        aaveLendingPool = AaveLendingPool(aaveAddressesProvider.getLendingPool());
        aaveProtocolDataProvider = AaveProtocolDataProvider(aaveAddressesProvider.getAddress(AAVE_PROVIDER_ID));
    }

    /**
     * @notice Update address of Aave LendingPoolAddressesProvider
     * @dev We will use new address to fetch lendingPool address and update that too.
     */
    function updateAddressesProvider(address _newAddressesProvider) external onlyGovernor {
        require(_newAddressesProvider != address(0), "input-is-zero-address");
        require(address(aaveAddressesProvider) != _newAddressesProvider, "same-addresses-provider");
        emit UpdatedAddressesProvider(address(aaveAddressesProvider), _newAddressesProvider);
        aaveAddressesProvider = AaveLendingPoolAddressesProvider(_newAddressesProvider);
        aaveLendingPool = AaveLendingPool(aaveAddressesProvider.getLendingPool());
        aaveProtocolDataProvider = AaveProtocolDataProvider(aaveAddressesProvider.getAddress(AAVE_PROVIDER_ID));
    }

    function isReservedToken(address _token) public view override returns (bool) {
        return _token == receiptToken;
    }

    /// @notice Large approval of token
    function _approveToken(uint256 _amount) internal override {
        collateralToken.safeApprove(pool, _amount);
        collateralToken.safeApprove(address(aaveLendingPool), _amount);
    }

    /**
     * @notice Deposit collateral amount in Aave
     * @dev Make sure to update collateralInvested
     */
    function _deposit(uint256 _amount) internal override {
        if (_amount != 0) {
            collateralInvested += _amount;
            aaveLendingPool.deposit(address(collateralToken), _amount, address(this), 0);
        }
    }

    function _liquidate(uint256 _excessDebt) internal override returns (uint256 _payback) {
        _payback = _safeWithdraw(address(this), _excessDebt);
    }

    /**
     * @notice Calculate earning and withdraw it from Aave.
     * @dev Make sure to reset collateralInvested
     * @dev If somehow we got some collateral token in strategy then we want to
     *  include those in profit. That's why we used 'return' outside 'if' condition.
     * @return profit in collateral token
     */
    function _realizeProfit() internal override returns (uint256) {
        uint256 _aTokenBalance = aToken.balanceOf(address(this));
        if (_aTokenBalance > collateralInvested) {
            _withdraw(address(this), _aTokenBalance - collateralInvested);
            // At this point, current balance of aToken is collateralInvested
            collateralInvested = aToken.balanceOf(address(this));
        }
        return collateralToken.balanceOf(address(this));
    }

    /**
     * @notice Calculate realized loss.
     * @dev Make sure to reset collateralInvested
     * @return _loss Realized loss in collateral token
     */
    function _realizeLoss() internal override returns (uint256 _loss) {
        uint256 _aTokenBalance = aToken.balanceOf(address(this));
        if (_aTokenBalance < collateralInvested) {
            _loss = collateralInvested - _aTokenBalance;
            // At this point, current balance of aToken is collateralInvested
            collateralInvested = _aTokenBalance;
        }
    }

    function _reinvest() internal override {
        _deposit(collateralToken.balanceOf(address(this)));
    }

    /**
     * @notice Withdraw given amount of collateral from Aave to pool
     * @param _amount Amount of collateral to withdraw.
     */
    function _withdraw(uint256 _amount) internal override {
        _safeWithdraw(pool, _amount);
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
        // If Vesper becomes large liquidity provider in Aave(This happended in past in vUSDC 1.0)
        // In this case we might have more aToken compare to available liquidity in Aave and any
        // withdraw asking more than available liquidity will fail. To do safe withdraw, check
        // _amount against availble liquidity.
        (uint256 _availableLiquidity, , , , , , , , , ) =
            aaveProtocolDataProvider.getReserveData(address(collateralToken));
        // Get minimum of _amount, _aTokenBalance and _availableLiquidity
        return _withdraw(_to, _min(_amount, _min(_aTokenBalance, _availableLiquidity)));
    }

    /**
     * @notice Withdraw given amount of collateral from Aave to given address
     * @dev Make sure to update collateralInvested
     * @param _to Address that will receive collateral token.
     * @param _amount Amount of collateral to withdraw.
     * @return Actual collateral withdrawn
     */
    function _withdraw(address _to, uint256 _amount) internal returns (uint256) {
        if (_amount != 0) {
            collateralInvested -= _amount;
            require(
                aaveLendingPool.withdraw(address(collateralToken), _amount, _to) == _amount,
                "withdrawn-amount-is-not-correct"
            );
        }
        return _amount;
    }

    /**
     * @notice Withdraw all collateral from Aave.
     * @dev File report to pool with proper loss and payback.
     *      Also update collateralInvested to 0.
     */
    function _withdrawAll() internal override {
        _withdraw(address(this), aToken.balanceOf(address(this)));
        IVesperPool(pool).reportEarning(0, collateralInvested, collateralToken.balanceOf(address(this)));
        collateralInvested = 0;
    }

    /// @notice Returns minumum of 2 given numbers
    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
