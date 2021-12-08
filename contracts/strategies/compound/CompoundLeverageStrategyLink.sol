// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./CompoundLeverageStrategy.sol";
import "../../interfaces/token/IToken.sol";

// solhint-disable no-empty-blocks
/// @title Deposit LINK in Compound and also borrow LINK based on leverage condition
contract CompoundLeverageStrategyLINK is CompoundLeverageStrategy {
    string public constant NAME = "Compound-Leverage-Strategy-LINK";
    string public constant VERSION = "3.0.22";

    // cLINK = 0xFAce851a4921ce59e912d19329929CE6da6EB0c7
    constructor(address _pool, address _swapManager)
        CompoundLeverageStrategy(_pool, _swapManager, 0xFAce851a4921ce59e912d19329929CE6da6EB0c7)
    {}
}
