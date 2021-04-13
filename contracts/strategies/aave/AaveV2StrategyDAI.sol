// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./AaveV2Strategy.sol";

//solhint-disable no-empty-blocks
contract AaveV2StrategyDAI is AaveV2Strategy {
    string public constant NAME = "AaveV2-Strategy-DAI";
    string public constant VERSION = "3.0.0";

    constructor(address _pool)
        AaveV2Strategy(_pool, 0x028171bCA77440897B824Ca71D1c56caC55b68A3) //aDAI
    {}
}
