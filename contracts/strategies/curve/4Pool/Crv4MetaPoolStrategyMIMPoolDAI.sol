// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./Crv4MetaPoolStrategyMIMPool.sol";

//solhint-disable no-empty-blocks
contract Crv4MetaPoolStrategyMIMPoolDAI is Crv4MetaPoolStrategyMIMPool {
    string public constant NAME = "Curve-4pool-MIMPool-DAI-Strategy";
    string public constant VERSION = "3.0.15";

    // collateralIdx for DAI is 1
    constructor(address _pool, address _swapManager) Crv4MetaPoolStrategyMIMPool(_pool, _swapManager, 1) {}
}
