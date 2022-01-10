// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./CompoundLeverageStrategy.sol";
import "../../interfaces/token/IToken.sol";

// solhint-disable no-empty-blocks
/// @title Deposit UNI in Compound and also borrow UNI based on leverage condition
contract CompoundLeverageStrategyUNI is CompoundLeverageStrategy {
    string public constant NAME = "CompoundLeverageStrategyUNI";
    string public constant VERSION = "4.0.0";

    constructor(
        address _pool,
        address _swapManager,
        address _receiptToken
    ) CompoundLeverageStrategy(_pool, _swapManager, _receiptToken) {}
}
