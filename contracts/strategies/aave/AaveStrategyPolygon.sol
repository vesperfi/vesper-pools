// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;
import "../Strategy.sol";
import "../../interfaces/aave/IAave.sol";

/// @dev This strategy will deposit collateral token in Aave and earn interest.
contract AaveStrategyPolygon is Strategy {
    using SafeERC20 for IERC20;

    // solhint-disable-next-line var-name-mixedcase
    string public NAME;
    string public constant VERSION = "4.0.0";

    bytes32 private constant AAVE_PROVIDER_ID = 0x0100000000000000000000000000000000000000000000000000000000000000;
    AaveLendingPool public aaveLendingPool;
    AaveProtocolDataProvider public aaveProtocolDataProvider;
    AaveIncentivesController public aaveIncentivesController;
    AaveLendingPoolAddressesProvider public aaveAddressesProvider =
        AaveLendingPoolAddressesProvider(0xd05e3E715d945B59290df0ae8eF85c1BdB684744);
    address public rewardToken = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;
    AToken internal immutable aToken;
    event UpdatedAddressesProvider(address _previousProvider, address _newProvider);

    constructor(
        address _pool,
        address _swapManager,
        address _receiptToken,
        string memory _name
    ) Strategy(_pool, _swapManager, _receiptToken) {
        require(_receiptToken != address(0), "aToken-address-is-zero");
        aToken = AToken(_receiptToken);
        // If there is no incentive then below call will fail
        try AToken(_receiptToken).getIncentivesController() returns (address _aaveIncentivesController) {
            aaveIncentivesController = AaveIncentivesController(_aaveIncentivesController);
        } catch {} //solhint-disable no-empty-blocks
        aaveLendingPool = AaveLendingPool(aaveAddressesProvider.getLendingPool());
        aaveProtocolDataProvider = AaveProtocolDataProvider(aaveAddressesProvider.getAddress(AAVE_PROVIDER_ID));
        NAME = _name;
    }

    /**
     * @notice Report total value
     * @dev aToken and collateral are 1:1
     */
    function totalValue() public view virtual override returns (uint256) {
        if (address(aaveIncentivesController) == address(0)) {
            // As there is no incentive return aToken balance as totalValue
            return aToken.balanceOf(address(this));
        }
        address[] memory _assets = new address[](1);
        _assets[0] = address(aToken);
        uint256 _rewardAccrued = aaveIncentivesController.getRewardsBalance(_assets, address(this));
        (, uint256 _rewardAsCollateral, ) =
            swapManager.bestOutputFixedInput(rewardToken, address(collateralToken), _rewardAccrued);
        // Total value = reward as collateral + aToken balance
        return _rewardAsCollateral + aToken.balanceOf(address(this));
    }

    /**
     * @notice Update address of Aave LendingPoolAddressesProvider
     * @dev We will use new address to fetch lendingPool address and update that too.
     */
    function updateAddressesProvider(address _newAddressesProvider) external onlyGovernor {
        require(_newAddressesProvider != address(0), "provider-address-is-zero");
        require(address(aaveAddressesProvider) != _newAddressesProvider, "same-addresses-provider");
        emit UpdatedAddressesProvider(address(aaveAddressesProvider), _newAddressesProvider);
        aaveAddressesProvider = AaveLendingPoolAddressesProvider(_newAddressesProvider);
        aaveLendingPool = AaveLendingPool(aaveAddressesProvider.getLendingPool());
        aaveProtocolDataProvider = AaveProtocolDataProvider(aaveAddressesProvider.getAddress(AAVE_PROVIDER_ID));
    }

    function isReservedToken(address _token) public view override returns (bool) {
        return _token == address(aToken) || _token == rewardToken;
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
    function _claimRewardsAndConvertTo(address _toToken) internal virtual override {
        uint256 _rewardAmount = _claimRewards();
        if (_rewardAmount != 0 && rewardToken != _toToken) {
            _safeSwap(rewardToken, _toToken, _rewardAmount, 1);
        }
    }

    /**
     * @notice Claim rewards from Aave incentive controller
     * @dev Return 0 if collateral has no incentive
     */
    function _claimRewards() internal returns (uint256) {
        if (address(aaveIncentivesController) == address(0)) {
            return 0;
        }
        address[] memory _assets = new address[](1);
        _assets[0] = address(aToken);
        aaveIncentivesController.claimRewards(_assets, type(uint256).max, address(this));
        return IERC20(rewardToken).balanceOf(address(this));
    }

    /// @notice Deposit asset into Aave
    function _deposit(uint256 _amount) internal {
        if (_amount != 0) {
            aaveLendingPool.deposit(address(collateralToken), _amount, address(this), 0);
        }
    }

    /// @notice Withdraw collateral to payback excess debt
    function _liquidate(uint256 _excessDebt) internal override returns (uint256 _payback) {
        if (_excessDebt != 0) {
            _payback = _safeWithdraw(address(this), _excessDebt);
        }
    }

    /// @notice Returns minimum of 2 given numbers
    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
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
        return _withdraw(_to, _min(_amount, _min(_aTokenBalance, _availableLiquidity)));
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
        if (_amount != 0) {
            require(
                aaveLendingPool.withdraw(address(collateralToken), _amount, _to) == _amount,
                "withdrawn-amount-is-not-correct"
            );
        }
        return _amount;
    }
}
