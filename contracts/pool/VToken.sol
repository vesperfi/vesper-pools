// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./VTokenBase.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// TODO we may not use it but I think this contract can help. It needs more work though
//solhint-disable no-empty-blocks
contract VToken is VTokenBase {
    uint256 internal immutable conversationFactor;

    constructor(
        string memory _name,
        string memory _symbol,
        address _token,
        address _controller
    ) VTokenBase(_name, _symbol, _token, _controller) {
        // TODO not going to work with 18 decimals
        conversationFactor = 10**18 - ERC20(_token).decimals();
    }

    /// @dev Convert to 18 decimals from token defined decimals.
    function convertTo18(uint256 _value) public view override returns (uint256) {
        return _value * conversationFactor;
    }

    /// @dev Convert from 18 decimals to token defined decimals.
    function convertFrom18(uint256 _value) public view override returns (uint256) {
        return _value / conversationFactor;
    }
}
