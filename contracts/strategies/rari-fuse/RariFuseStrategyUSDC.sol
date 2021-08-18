// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./RariFuseStrategy.sol";

// solhint-disable no-empty-blocks
/// @title Deposit USDC in a Rari Fuse Pool and earn interest.
contract RariFuseStrategyUSDC is RariFuseStrategy {
    string public constant NAME = "RariFuse-Strategy-USDC";
    string public constant VERSION = "3.0.11";

    constructor(address _pool, address _swapManager)
        RariFuseStrategy(
            _pool,
            _swapManager,
            _cTokenByUnderlying(18, 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) // Pool #18, USDC
        )
    {}
}
