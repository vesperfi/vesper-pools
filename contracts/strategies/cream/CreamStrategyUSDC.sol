// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./CreamStrategy.sol";

// solhint-disable no-empty-blocks
/// @title Deposit USDC in C.R.E.A.M. and earn interest.
contract CreamStrategyUSDC is CreamStrategy {
    string public constant NAME = "Cream-Strategy-USDC";
    string public constant VERSION = "3.0.0";

    // crUSDC = 0x44fbeBd2F576670a6C33f6Fc0B00aA8c5753b322
    constructor(address _pool, address _swapManager)
        CreamStrategy(_pool, _swapManager, 0x44fbeBd2F576670a6C33f6Fc0B00aA8c5753b322)
    {}
}
