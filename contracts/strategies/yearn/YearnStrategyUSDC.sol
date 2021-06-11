// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./YearnStrategy.sol";

// solhint-disable no-empty-blocks
/// @title Deposit USDC in Yearn's USDC yVault and earn interest.
contract YearnStrategyUSDC is YearnStrategy {
    string public constant NAME = "Yearn-Strategy-USDC";
    string public constant VERSION = "3.0.0";

    // yvUSDC = 0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9
    constructor(address _pool, address _swapManager)
        YearnStrategy(_pool, _swapManager, 0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9)
    {}
}
