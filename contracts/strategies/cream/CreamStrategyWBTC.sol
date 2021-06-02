// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./CreamStrategy.sol";

// solhint-disable no-empty-blocks
/// @title Deposit WBTC in C.R.E.A.M. and earn interest.
contract CreamStrategyWBTC is CreamStrategy {
    string public constant NAME = "Cream-Strategy-WBTC";
    string public constant VERSION = "3.0.0";

    // crWBTC = 0x197070723CE0D3810a0E47F06E935c30a480D4Fc
    constructor(address _pool, address _swapManager)
        CreamStrategy(_pool, _swapManager, 0x197070723CE0D3810a0E47F06E935c30a480D4Fc)
    {}
}
