// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./Crv2PoolStrategy.sol";

//solhint-disable no-empty-blocks
contract Crv2PoolStrategyMIMUSTPool is Crv2PoolStrategy {
    // MIM/UST LP Token
    address internal constant CRV_LP = 0x55A8a39bc9694714E2874c1ce77aa1E599461E18;
    // MIM/UST Pool
    address internal constant CRV_POOL = 0x55A8a39bc9694714E2874c1ce77aa1E599461E18;
    // MIM/UST Gauge
    address internal constant GAUGE = 0xB518f5e3242393d4eC792BD3f44946A3b98d0E48;

    constructor(
        address _pool,
        address _swapManager,
        uint256 _collateralIdx,
        string memory _name
    ) Crv2PoolStrategy(_pool, _swapManager, CRV_POOL, CRV_LP, GAUGE, _collateralIdx, _name) {}
}
