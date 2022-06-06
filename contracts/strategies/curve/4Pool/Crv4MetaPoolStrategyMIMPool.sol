// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./Crv4MetaPoolStrategy.sol";

//solhint-disable no-empty-blocks
contract Crv4MetaPoolStrategyMIMPool is Crv4MetaPoolStrategy {
    // MIM-3CRV Metapool
    // Composed of [ MIM , [ DAI, USDC, USDT ]]
    address internal constant METAPOOL = 0x5a6A4D54456819380173272A5E8E9B9904BdF41B;
    // Gauge for MIM-3CRV Metapool
    address internal constant GAUGE = 0xd8b712d29381748dB89c36BCa0138d7c75866ddF;

    constructor(
        address _pool,
        address _swapManager,
        uint256 _collateralIdx,
        string memory _name
    ) Crv4MetaPoolStrategy(_pool, _swapManager, METAPOOL, GAUGE, _collateralIdx, _name) {}
}
