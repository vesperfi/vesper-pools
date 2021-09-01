// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./EarnAaveStrategy.sol";
import "../../../interfaces/token/IToken.sol";

// solhint-disable no-empty-blocks
/// @title Deposit WETH in Aave and earn interest in DAI.
contract EarnAaveStrategyWETH is EarnAaveStrategy {
    string public constant NAME = "Earn-Aave-Strategy-WETH";
    string public constant VERSION = "3.0.5";

    // aWETH = 0x030bA81f1c18d280636F32af80b9AAd02Cf0854e
    // DAI = 0x6b175474e89094c44da98b954eedeac495271d0f
    constructor(address _pool, address _swapManager)
        EarnAaveStrategy(
            _pool,
            _swapManager,
            0x030bA81f1c18d280636F32af80b9AAd02Cf0854e,
            0x6B175474E89094C44Da98b954EedeAC495271d0F
        )
    {}
}
