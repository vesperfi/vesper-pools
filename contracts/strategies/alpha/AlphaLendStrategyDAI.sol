// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

/* solhint-disable no-empty-blocks */

import "./AlphaLendStrategy.sol";

/// @title Deposit DAI in Alpha and earn interest.
contract AlphaLendStrategyDAI is AlphaLendStrategy {
    string public constant NAME = "Alpha-Lend-Strategy-DAI";
    string public constant VERSION = "3.0.0";

    // ibDAIv2 = 0xee8389d235E092b2945fE363e97CDBeD121A0439
    constructor(address _pool, address _swapManager)
        AlphaLendStrategy(_pool, _swapManager, 0xee8389d235E092b2945fE363e97CDBeD121A0439)
    {}
}
