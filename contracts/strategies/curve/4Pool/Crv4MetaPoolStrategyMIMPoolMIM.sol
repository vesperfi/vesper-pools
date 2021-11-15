// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./Crv4MetaPoolStrategyMIMPool.sol";

//solhint-disable no-empty-blocks
contract Crv4MetaPoolStrategyMIMPoolMIM is Crv4MetaPoolStrategyMIMPool {
    string public constant NAME = "Curve-4pool-MIMPool-MIM-Strategy";
    string public constant VERSION = "3.0.15";

    // collateralIdx for MIM is 0
    constructor(address _pool, address _swapManager) Crv4MetaPoolStrategyMIMPool(_pool, _swapManager, 0) {}

    /// @dev Convert from 18 decimals to token defined decimals. Default no conversion.
    function convertFrom18(uint256 amount) public pure override returns (uint256) {
        return amount;
    }
}
