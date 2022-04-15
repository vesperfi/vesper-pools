// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../../interfaces/aave/IAave.sol";
import "../../pool/Errors.sol";

abstract contract AaveCoreAvalanche {
    bytes32 private constant AAVE_PROVIDER_ID = 0x0100000000000000000000000000000000000000000000000000000000000000;
    AaveLendingPool public aaveLendingPool;
    AaveProtocolDataProvider public aaveProtocolDataProvider;
    AaveIncentivesController public aaveIncentivesController;

    address internal constant AAVE_ADDRESSES_PROVIDER = 0xb6A86025F0FE1862B372cb0ca18CE3EDe02A318f;
    // WAVAX address
    address public constant rewardToken = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7;
    AToken internal immutable aToken;

    constructor(address _receiptToken) {
        require(_receiptToken != address(0), "aToken-address-is-zero");
        aToken = AToken(_receiptToken);
        _fetchAaveAddresses(_receiptToken);
    }

    /**
     * @notice Fetch Aave related addresses again from LendingPoolAddressesProvider.
     */
    function fetchAaveAddresses() external {
        _fetchAaveAddresses(address(aToken));
    }

    /**
     * @notice Claim rewards from Aave incentive controller
     * @dev Return 0 if collateral has no incentive
     */
    function _claimRewards() internal virtual returns (uint256) {
        if (address(aaveIncentivesController) == address(0)) {
            return 0;
        }
        address[] memory _assets = new address[](1);
        _assets[0] = address(aToken);
        aaveIncentivesController.claimRewards(_assets, type(uint256).max, address(this));
        return IERC20(rewardToken).balanceOf(address(this));
    }

    /// @dev Reread aave related addresses from provider
    function _fetchAaveAddresses(address _receiptToken) private {
        // If there is no incentive then below call will fail
        try AToken(_receiptToken).getIncentivesController() returns (address _aaveIncentivesController) {
            aaveIncentivesController = AaveIncentivesController(_aaveIncentivesController);
        } catch {} //solhint-disable no-empty-blocks
        AaveLendingPoolAddressesProvider _provider = AaveLendingPoolAddressesProvider(AAVE_ADDRESSES_PROVIDER);
        aaveLendingPool = AaveLendingPool(_provider.getLendingPool());
        aaveProtocolDataProvider = AaveProtocolDataProvider(_provider.getAddress(AAVE_PROVIDER_ID));
    }

    function _getRewardAccrued() internal view virtual returns (uint256 _rewardAccrued) {
        if (address(aaveIncentivesController) != address(0)) {
            address[] memory _assets = new address[](1);
            _assets[0] = address(aToken);
            return aaveIncentivesController.getRewardsBalance(_assets, address(this));
        }
    }

    /// @dev Check whether given token is reserved or not. Reserved tokens are not allowed to sweep.
    function _isReservedToken(address _token) internal view returns (bool) {
        return _token == address(aToken) || _token == rewardToken;
    }
}
