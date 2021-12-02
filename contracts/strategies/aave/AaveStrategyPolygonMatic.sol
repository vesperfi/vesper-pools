// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./AaveStrategyPolygon.sol";

//solhint-disable no-empty-blocks
contract AaveStrategyPolygonWMATIC is AaveStrategyPolygon {
    string public constant NAME = "Aave-Strategy-WMATIC";
    string public constant VERSION = "3.0.21";

    // amWMAtiC = 0x8dF3aad3a84da6b69A4DA8aeC3eA40d9091B2Ac4
    constructor(address _pool, address _swapManager)
        AaveStrategyPolygon(_pool, _swapManager, 0x8dF3aad3a84da6b69A4DA8aeC3eA40d9091B2Ac4)
    {}
}
