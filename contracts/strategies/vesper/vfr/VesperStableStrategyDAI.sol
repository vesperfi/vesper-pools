// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;
import "../../VFR.sol";
import "./VesperStableStrategy.sol";

// solhint-disable no-empty-blocks
contract VesperStableStrategyDAI is VesperStableStrategy {
    // vaDAI = 0x0538C8bAc84E95A9dF8aC10Aad17DbE81b9E36ee
    constructor(address _pool, address _swapManager)
        VesperStableStrategy(_pool, _swapManager, 0x0538C8bAc84E95A9dF8aC10Aad17DbE81b9E36ee)
    {}
}
