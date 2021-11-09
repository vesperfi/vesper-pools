// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./Crv2PoolStrategyMIMUSTPool.sol";

//solhint-disable no-empty-blocks
contract Crv2PoolStrategyMIMUSTPoolMIM is Crv2PoolStrategyMIMUSTPool {
    string public constant NAME = "Curve-2pool-MIMUSTPool-MIM-Strategy";
    string public constant VERSION = "3.0.15";

    // collateralIdx for MIM is 0
    constructor(address _pool, address _swapManager) Crv2PoolStrategyMIMUSTPool(_pool, _swapManager, 0) {}
}
