// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

/* solhint-disable no-empty-blocks */

import "./AlphaLendStrategy.sol";

/// @title Deposit LINK in Alpha and earn interest.
contract AlphaLendStrategyLINK is AlphaLendStrategy {
    string public constant NAME = "Alpha-Lend-Strategy-LINK";
    string public constant VERSION = "3.0.0";

    // ibLINKv2 = 0xb59Ecdf6C2AEA5E67FaFbAf912B26658d43295Ed
    constructor(address _pool, address _swapManager)
        AlphaLendStrategy(_pool, _swapManager, 0xb59Ecdf6C2AEA5E67FaFbAf912B26658d43295Ed)
    {}
}
