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

    IERC20 internal immutable aToken;
    uint256 internal collateralInvested;

    event UpdatedAddressesProvider(address _previousProvider, address _newProvider);

    constructor(address _pool, address _receiptToken) Strategy(_pool, _receiptToken) {
        require(_receiptToken != address(0), "aToken-is-zero-address");
        aToken = IERC20(_receiptToken);
        aaveLendingPool = AaveLendingPool(aaveAddressesProvider.getLendingPool());
    }

    //solhint-disable no-empty-blocks
    function beforeWithdraw() external override onlyPool {}

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
        uint256 _aTokenBalance = aToken.balanceOf(address(this));
        // Get minimum of two
        _payback = _excessDebt < _aTokenBalance ? _excessDebt : _aTokenBalance;
        _withdrawHere(_payback);
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
            _withdrawHere(_aTokenBalance - collateralInvested);
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
     * @dev Make sure to update collateralInvested
     * @param _amount Amount of aToken to withdraw
     */
    function _withdraw(uint256 _amount) internal override {
        if (_amount != 0) {
            collateralInvested -= _amount;
            require(
                aaveLendingPool.withdraw(address(collateralToken), _amount, pool) == _amount,
                "withdrawn-amount-is-not-correct"
            );
        }
    }

    /**
     * @notice Withdraw given amount of collateral from Aave to this address
     * @dev Make sure to update collateralInvested
     * @param _amount Amount of aToken to withdraw
     */
    function _withdrawHere(uint256 _amount) internal {
        if (_amount != 0) {
            collateralInvested -= _amount;
            require(
                aaveLendingPool.withdraw(address(collateralToken), _amount, address(this)) == _amount,
                "withdrawn-amount-is-not-correct"
            );
        }
    }

    /**
     * @dev Withdraw all collateral from Aave.
     */
    // TODO Pool might require to file a report, do update as needed.
    function _withdrawAll() internal override {
        _withdraw(aToken.balanceOf(address(this)));
        collateralInvested = 0;
    }
}
