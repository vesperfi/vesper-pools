// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./EarnYearnStrategy.sol";

// solhint-disable no-empty-blocks
/// @title Deposit WETH in Yearn Vault and earn interest in DAI.
contract EarnYearnStrategyETH is EarnYearnStrategy {
    string public constant NAME = "Earn-Yearn-Strategy-ETH";
    string public constant VERSION = "3.0.5";

    // yvWETH = 0xa258C4606Ca8206D8aA700cE2143D7db854D168c
    // DAI = 0x6b175474e89094c44da98b954eedeac495271d0f
    constructor(address _pool, address _swapManager)
        EarnYearnStrategy(
            _pool,
            _swapManager,
            0xa258C4606Ca8206D8aA700cE2143D7db854D168c,
            0x6B175474E89094C44Da98b954EedeAC495271d0F
        )
    {}
}
