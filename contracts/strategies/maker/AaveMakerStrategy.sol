// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./MakerStrategy.sol";
import "../../interfaces/aave/IAaveV2.sol";

/// @dev This strategy will deposit collateral token in Maker, borrow Dai and
/// deposit borrowed DAI in Aave to earn interest.
abstract contract AaveMakerStrategy is MakerStrategy {
    using SafeERC20 for IERC20;
    IERC20 internal immutable aToken;

    AaveLendingPoolAddressesProvider public aaveAddressesProvider =
        AaveLendingPoolAddressesProvider(0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5);
    AaveLendingPool public aaveLendingPool;
    AaveProtocolDataProvider public aaveProtocolDataProvider;

    bytes32 private constant AAVE_PROVIDER_ID = 0x0100000000000000000000000000000000000000000000000000000000000000;
    event UpdatedAddressesProvider(address _previousProvider, address _newProvider);

    constructor(
        address _pool,
        address _cm,
        address _receiptToken,
        bytes32 _collateralType
    ) MakerStrategy(_pool, _cm, _receiptToken, _collateralType) {
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

    function _getDaiBalance() internal view override returns (uint256) {
        return aToken.balanceOf(address(this));
    }

    function _depositDaiToLender(uint256 _amount) internal override {
        aaveLendingPool.deposit(DAI, _amount, address(this), 0);
    }

    function _withdrawDaiFromLender(uint256 _amount) internal override {
        uint256 _aTokenBalance = aToken.balanceOf(address(this));
        // If Vesper becomes large liquidity provider in Aave(This happended in past in vUSDC 1.0)
        // In this case we might have more aToken compare to available liquidity in Aave and any
        // withdraw asking more than available liquidity will fail. To do safe withdraw, check
        // _amount against availble liquidity.
        (uint256 _availableLiquidity, , , , , , , , , ) = aaveProtocolDataProvider.getReserveData(DAI);
        // Get minimum of _amount, _aTokenBalance and _availableLiquidity
        uint256 _amountToWithdraw = _min(_amount, _min(_aTokenBalance, _availableLiquidity));

        require(
            aaveLendingPool.withdraw(DAI, _amountToWithdraw, address(this)) == _amountToWithdraw,
            "withdrawn-amount-is-not-correct"
        );
    }

    function _rebalanceDaiInLender() internal override {
        uint256 _daiDebt = cm.getVaultDebt(vaultNum);
        uint256 _daiBalance = _getDaiBalance();
        if (_daiBalance > _daiDebt) {
            _withdrawDaiFromLender(_daiBalance - _daiDebt);
        }
    }

    /// @notice Returns minumum of 2 given numbers
    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
