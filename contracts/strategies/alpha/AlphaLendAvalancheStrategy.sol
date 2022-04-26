// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./AlphaLendStrategy.sol";

/// @title This strategy will deposit collateral token in Alpha SafeBox (ibXYZv2) and earn interest.
contract AlphaLendAvalancheStrategy is AlphaLendStrategy {
    constructor(
        address _pool,
        address _swapManager,
        address _receiptToken,
        string memory _name
    ) AlphaLendStrategy(_pool, _swapManager, _receiptToken, _name) {
        WETH = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7; // WAVAX
        ALPHA = 0x2147EFFF675e4A4eE1C2f918d181cDBd7a8E208f; // Alpha on Avalanche
    }
}
