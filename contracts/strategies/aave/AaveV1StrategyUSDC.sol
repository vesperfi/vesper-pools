// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./AaveV1Strategy.sol";

//solhint-disable no-empty-blocks
contract AaveV1StrategyUSDC is AaveV1Strategy {
    string public constant NAME = "AaveV1-Strategy-USDC";
    string public constant VERSION = "3.0.1";

    // aUSDC V1 = 0x9bA00D6856a4eDF4665BcA2C2309936572473B7E
    constructor(address _pool, address _swapManager)
        AaveV1Strategy(_pool, _swapManager, 0x9bA00D6856a4eDF4665BcA2C2309936572473B7E)
    {}
}
