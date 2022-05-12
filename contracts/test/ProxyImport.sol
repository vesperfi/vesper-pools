// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../dependencies/openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "../dependencies/openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";

// Hardhat only compile contract which are either in /contracts directory or
// being imported in any contract. We need proxy for test purpose so importing here.
// solhint-disable no-empty-blocks
contract ProxyImport {

}
