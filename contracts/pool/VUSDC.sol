// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./VTokenBase.sol";

contract VUSDC is VTokenBase {
    string public constant VERSION = "3.0.0";

    // USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
    function initialize(address _addressListFactory) public initializer {
        _initializePool("vUSDC Pool", "vUSDC", 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
        _initializeGoverned();
        _initializeAddressLists(_addressListFactory);
    }

    /// @dev Convert from 18 decimals to token defined decimals.
    function convertFrom18(uint256 _value) public pure override returns (uint256) {
        return _value / (10**12);
    }
}
