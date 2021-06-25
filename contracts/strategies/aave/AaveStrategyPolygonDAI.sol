// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./AaveStrategyPolygon.sol";

//solhint-disable no-empty-blocks
contract AaveStrategyPolygonDAI is AaveStrategyPolygon {
    string public constant NAME = "Aave-Strategy-DAI";
    string public constant VERSION = "3.0.3";

    // amDAI = 0x27F8D03b3a2196956ED754baDc28D73be8830A6e
    constructor(address _pool, address _swapManager)
        AaveStrategyPolygon(_pool, _swapManager, 0x27F8D03b3a2196956ED754baDc28D73be8830A6e)
    {}
}
