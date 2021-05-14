// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./Crv3PoolStrategy.sol";

//solhint-disable no-empty-blocks
contract Crv3PoolStrategyUSDC is Crv3PoolStrategy {
    string public constant NAME = "Strategy-Curve-3pool-USDC";
    string public constant VERSION = "1.0.0";

    constructor(address _pool, address _swapManager) Crv3PoolStrategy(_pool, _swapManager, 1) {}

    function convertFrom18(uint256 amount) public pure override returns (uint256) {
        return amount / (10**12);
    }
}
