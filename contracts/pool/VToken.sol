// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./VTokenBase.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// TODO If we ever want to use it, it will need testing for decimals
//solhint-disable no-empty-blocks
contract VToken is VTokenBase {
    uint256 internal immutable conversationFactor;

    constructor(
        string memory _name,
        string memory _symbol,
        address _token,
        address _controller
    ) VTokenBase(_name, _symbol, _token, _controller) {
        conversationFactor = 10**(18 - ERC20(_token).decimals());
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
