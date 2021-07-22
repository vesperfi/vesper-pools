// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./CrvA3PoolStrategy.sol";

//solhint-disable no-empty-blocks
contract CrvA3PoolStrategyDAI is CrvA3PoolStrategy {
    string public constant NAME = "Curve-a3pool-DAI-Strategy";
    string public constant VERSION = "3.0.7";

    constructor(address _pool, address _swapManager) CrvA3PoolStrategy(_pool, _swapManager, 0) {}
}
