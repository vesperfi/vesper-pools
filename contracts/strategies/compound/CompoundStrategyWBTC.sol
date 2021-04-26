// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./CompoundStrategy.sol";
import "../../interfaces/token/IToken.sol";

/// @title Deposit WBTC in Compound and earn interest.
contract CompoundStrategyWBTC is CompoundStrategy {
    string public constant NAME = "Compound-Strategy-WBTC";
    string public constant VERSION = "3.0.0";

    // solhint-disable-next-line no-empty-blocks
    constructor(address _pool) CompoundStrategy(_pool, 0xC11b1268C1A384e55C48c2391d8d480264A3A7F4) {}
}
