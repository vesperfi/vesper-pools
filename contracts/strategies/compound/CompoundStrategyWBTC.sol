// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./CompoundStrategy.sol";

// solhint-disable no-empty-blocks
/// @title Deposit WBTC in Compound and earn interest.
contract CompoundStrategyWBTC is CompoundStrategy {
    string public constant NAME = "Compound-Strategy-WBTC";
    string public constant VERSION = "3.0.0";

    // cWBTC = 0xccF4429DB6322D5C611ee964527D42E5d685DD6a
    constructor(address _pool, address _swapManager)
        CompoundStrategy(_pool, _swapManager, 0xccF4429DB6322D5C611ee964527D42E5d685DD6a)
    {}
}
