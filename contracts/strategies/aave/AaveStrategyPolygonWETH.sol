// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./AaveStrategyPolygon.sol";

//solhint-disable no-empty-blocks
contract AaveStrategyPolygonWETH is AaveStrategyPolygon {
    string public constant NAME = "Aave-Strategy-WETH";
    string public constant VERSION = "3.0.7";

    // amWETH = 0x28424507fefb6f7f8E9D3860F56504E4e5f5f390
    constructor(address _pool, address _swapManager)
        AaveStrategyPolygon(_pool, _swapManager, 0x28424507fefb6f7f8E9D3860F56504E4e5f5f390)
    {}
}
