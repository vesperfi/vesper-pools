// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

/* solhint-disable no-empty-blocks */

import "./AlphaLendStrategy.sol";

/// @title Deposit USDC in Alpha and earn interest.
contract AlphaLendStrategyUSDC is AlphaLendStrategy {
    string public constant NAME = "Alpha-Lend-Strategy-USDC";
    string public constant VERSION = "3.0.0";

    // ibUSDCv2 = 0x08bd64BFC832F1C2B3e07e634934453bA7Fa2db2
    constructor(address _pool, address _swapManager)
        AlphaLendStrategy(_pool, _swapManager, 0x08bd64BFC832F1C2B3e07e634934453bA7Fa2db2)
    {}
}
