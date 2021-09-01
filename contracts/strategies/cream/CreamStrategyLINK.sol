// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;
import "./CreamStrategy.sol";

// solhint-disable no-empty-blocks
/// @title Deposit LINK in C.R.E.A.M. and earn interest.
contract CreamStrategyLINK is CreamStrategy {
    string public constant NAME = "Cream-Strategy-LINK";
    string public constant VERSION = "3.0.0";

    // crLINK = 0x697256CAA3cCaFD62BB6d3Aa1C7C5671786A5fD9
    constructor(address _pool, address _swapManager)
        CreamStrategy(_pool, _swapManager, 0x697256CAA3cCaFD62BB6d3Aa1C7C5671786A5fD9)
    {}
}
