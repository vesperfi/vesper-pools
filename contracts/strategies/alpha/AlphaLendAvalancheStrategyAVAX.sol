// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

/* solhint-disable no-empty-blocks */

import "./AlphaLendStrategyETH.sol";

/// @title Deposit ETH in Alpha and earn interest.
contract AlphaLendAvalancheStrategyAVAX is AlphaLendStrategyETH {
    address internal constant WAVAX = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7; // WAVAX

    constructor(
        address _pool,
        address _swapManager,
        address _receiptToken,
        string memory _name
    ) AlphaLendStrategyETH(_pool, _swapManager, _receiptToken, _name) {
        WETH = WAVAX; // WAVAX
        ALPHA = 0x2147EFFF675e4A4eE1C2f918d181cDBd7a8E208f; // Alpha on Avalanche
    }

    function _setupCheck(address _pool) internal view virtual override {
        require(address(IVesperPool(_pool).token()) == WAVAX, "u-token-mismatch");
    }
}
