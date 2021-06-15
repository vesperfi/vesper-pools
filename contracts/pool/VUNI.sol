// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./VTokenBase.sol";

contract VUNI is VTokenBase {
    string public constant VERSION = "3.0.2";

    // UNI = 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984
    function initialize(address _addressListFactory) public initializer {
        _initializePool("vUNI Pool", "vUNI", 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984);
        _initializeGoverned();
        _initializeAddressLists(_addressListFactory);
    }
}
