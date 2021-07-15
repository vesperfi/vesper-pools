// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./AaveStrategyPolygon.sol";

//solhint-disable no-empty-blocks
contract AaveStrategyPolygonUSDT is AaveStrategyPolygon {
    string public constant NAME = "Aave-Strategy-USDT";
    string public constant VERSION = "3.0.7";

    // amUSDT = 0x60D55F02A771d515e077c9C2403a1ef324885CeC
    constructor(address _pool, address _swapManager)
        AaveStrategyPolygon(_pool, _swapManager, 0x60D55F02A771d515e077c9C2403a1ef324885CeC)
    {}
}
