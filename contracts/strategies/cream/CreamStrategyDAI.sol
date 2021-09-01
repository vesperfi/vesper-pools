// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;
import "./CreamStrategy.sol";

// solhint-disable no-empty-blocks
/// @title Deposit DAI in C.R.E.A.M. and earn interest.
contract CreamStrategyDAI is CreamStrategy {
    string public constant NAME = "Cream-Strategy-DAI";
    string public constant VERSION = "3.0.0";

    // crDAI = 0x92B767185fB3B04F881e3aC8e5B0662a027A1D9f
    constructor(address _pool, address _swapManager)
        CreamStrategy(_pool, _swapManager, 0x92B767185fB3B04F881e3aC8e5B0662a027A1D9f)
    {}
}
