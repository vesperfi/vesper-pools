// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./AaveMakerStrategy.sol";

//solhint-disable no-empty-blocks
contract AaveMakerStrategyETH is AaveMakerStrategy {
    string public constant NAME = "AaveMaker-Strategy-ETH";
    string public constant VERSION = "3.0.0";

    // aDAI = 0x028171bCA77440897B824Ca71D1c56caC55b68A3
    constructor(address _pool, address _cm)
        AaveMakerStrategy(_pool, _cm, 0x028171bCA77440897B824Ca71D1c56caC55b68A3, "ETH-A")
    {}
}
