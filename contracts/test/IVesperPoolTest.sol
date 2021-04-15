// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;
import "../interfaces/vesper/IVesperPool.sol";

interface IVesperPoolTest is IVesperPool {
    function strategies(uint256) external view returns (address);
}
