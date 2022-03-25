// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../dependencies/openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract PoolStorageV1 {
    IERC20 public token; // Collateral token

    address public poolAccountant; // PoolAccountant address
    address public poolRewards; // PoolRewards contract address
    address private feeWhitelistObsolete; // Obsolete in favor of AddressSet of feeWhitelist
    address private keepersObsolete; // Obsolete in favor of AddressSet of keepers
    address private maintainersObsolete; // Obsolete in favor of AddressSet of maintainers
    address public feeCollector; // Fee collector address
    uint256 private withdrawFeeObsolete; // Withdraw fee for this pool. Obsolete in favor of management fee
    uint256 public decimalConversionFactor; // It can be used in converting value to/from 18 decimals
    bool internal withdrawInETH; // This flag will be used by VETH pool as switch to withdraw ETH or WETH
}

contract PoolStorageV2 is PoolStorageV1 {
    EnumerableSet.AddressSet private _feeWhitelistObsolete; // Obsolete in favor of management fee
    EnumerableSet.AddressSet internal _keepers; // List of keeper addresses
    EnumerableSet.AddressSet internal _maintainers; // List of maintainer addresses
}
