// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./AaveStrategyPolygon.sol";

//solhint-disable no-empty-blocks
contract AaveStrategyPolygonWBTC is AaveStrategyPolygon {
    string public constant NAME = "Aave-Strategy-WBTC";
    string public constant VERSION = "3.0.7";

    // amWBTC = 0x5c2ed810328349100A66B82b78a1791B101C9D61
    constructor(address _pool, address _swapManager)
        AaveStrategyPolygon(_pool, _swapManager, 0x5c2ed810328349100A66B82b78a1791B101C9D61)
    {}
}
