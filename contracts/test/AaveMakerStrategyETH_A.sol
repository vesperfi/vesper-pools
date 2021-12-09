// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "../strategies/maker/AaveMakerStrategy.sol";

//solhint-disable no-empty-blocks, contract-name-camelcase
contract AaveMakerStrategyETH_A is AaveMakerStrategy {
    // aDAI = 0x028171bCA77440897B824Ca71D1c56caC55b68A3
    constructor(
        address _pool,
        address _cm,
        address _swapManager
    )
        AaveMakerStrategy(
            _pool,
            _cm,
            _swapManager,
            0x028171bCA77440897B824Ca71D1c56caC55b68A3,
            "ETH-A",
            "AaveMakerStrategyETH_A"
        )
    {}
}
