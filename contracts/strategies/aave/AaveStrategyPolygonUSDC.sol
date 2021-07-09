// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./AaveStrategyPolygon.sol";

//solhint-disable no-empty-blocks
contract AaveStrategyPolygonUSDC is AaveStrategyPolygon {
    string public constant NAME = "Aave-Strategy-USDC";
    string public constant VERSION = "3.0.4";

    // amUSDC = 0x1a13F4Ca1d028320A707D99520AbFefca3998b7F
    constructor(address _pool, address _swapManager)
        AaveStrategyPolygon(_pool, _swapManager, 0x1a13F4Ca1d028320A707D99520AbFefca3998b7F)
    {}
}
