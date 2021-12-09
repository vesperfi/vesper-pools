// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./VesperMakerStrategy.sol";

//solhint-disable no-empty-blocks
contract VesperMakerStrategyLINK is VesperMakerStrategy {
    string public constant NAME = "Vesper-Maker-Strategy-LINK";
    string public constant VERSION = "3.0.22";

    constructor(
        address _pool,
        address _cm,
        address _swapManager,
        address _vPool
    ) VesperMakerStrategy(_pool, _cm, _swapManager, _vPool, "LINK-A") {}

    /// @dev Convert from 18 decimals to token defined decimals. Default no conversion.
    function convertFrom18(uint256 amount) public pure override returns (uint256) {
        return amount;
    }
}
