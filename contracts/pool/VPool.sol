// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./VPoolBase.sol";

//solhint-disable no-empty-blocks
contract VPool is VPoolBase {
    string public constant VERSION = "4.0.0";

    constructor(
        string memory _name,
        string memory _symbol,
        address _token
    ) VPoolBase(_name, _symbol, _token) {}

    function initialize(
        string memory _name,
        string memory _symbol,
        address _token,
        address _poolAccountant
    ) public initializer {
        _initializeBase(_name, _symbol, _token, _poolAccountant);
    }

    /// @dev This is one time activity to fix name and symbol of Avalanche pools
    function updateNameAndSymbol(string memory _name, string memory _symbol) external onlyGovernor {
        _setName(_name);
        _setSymbol(_symbol);
    }
}
