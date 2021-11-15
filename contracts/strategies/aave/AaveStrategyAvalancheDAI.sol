// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./AaveStrategyAvalanche.sol";

//solhint-disable no-empty-blocks
contract AaveStrategyAvalancheDAI is AaveStrategyAvalanche {
    string public constant NAME = "Aave-Strategy-DAI";
    string public constant VERSION = "3.0.3";

    // avDAI = 0x47AFa96Cdc9fAb46904A55a6ad4bf6660B53c38a
    constructor(address _pool, address _swapManager)
        AaveStrategyAvalanche(_pool, _swapManager, 0x47AFa96Cdc9fAb46904A55a6ad4bf6660B53c38a)
    {}
}
