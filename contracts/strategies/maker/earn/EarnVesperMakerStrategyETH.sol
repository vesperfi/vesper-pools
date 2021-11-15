// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./EarnVesperMakerStrategy.sol";

//solhint-disable no-empty-blocks
contract EarnVesperMakerStrategyETH is EarnVesperMakerStrategy {
    string public constant NAME = "Earn-Vesper-Maker-Strategy-ETH";
    string public constant VERSION = "3.0.20";

    constructor(
        address _pool,
        address _cm,
        address _swapManager,
        address _vPool
    ) EarnVesperMakerStrategy(_pool, _cm, _swapManager, _vPool, "ETH-C", DAI) {}

    /// @dev Convert from 18 decimals to token defined decimals. Default no conversion.
    function convertFrom18(uint256 amount) public pure override returns (uint256) {
        return amount;
    }
}
