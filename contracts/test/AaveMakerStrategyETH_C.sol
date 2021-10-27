// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "../strategies/maker/AaveMakerStrategy.sol";

//solhint-disable no-empty-blocks
contract AaveMakerStrategyETH_C is AaveMakerStrategy {
    string public constant NAME = "Aave-Maker-Strategy-ETH_C";
    string public constant VERSION = "3.0.0";

    // aDAI = 0x028171bCA77440897B824Ca71D1c56caC55b68A3
    constructor(
        address _pool,
        address _cm,
        address _swapManager
    ) AaveMakerStrategy(_pool, _cm, _swapManager, 0x028171bCA77440897B824Ca71D1c56caC55b68A3, "ETH-C") {}
}
