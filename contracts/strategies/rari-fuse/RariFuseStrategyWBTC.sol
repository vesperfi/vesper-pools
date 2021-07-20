// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./RariFuseStrategy.sol";

// solhint-disable no-empty-blocks
/// @title Deposit WBTC in a Rari Fuse Pool and earn interest.
contract RariFuseStrategyWBTC is RariFuseStrategy {
    string public constant NAME = "RariFuse-Strategy-WBTC";
    string public constant VERSION = "3.0.0";

    constructor(address _pool, address _swapManager)
        RariFuseStrategy(
            _pool,
            _swapManager,
            _cTokenByUnderlying(3, 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599) // WBTC, Pool #3
        )
    {}
}
