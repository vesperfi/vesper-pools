// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;
import "../interfaces/vesper/IVesperPool.sol";

interface IVesperPoolTest is IVesperPool {
    function strategies(uint256) external view returns (address);

    function feeWhitelist() external view returns (address);

    function isFeeWhitelisted(address) external view returns (bool);

    // solhint-disable-next-line func-name-mixedcase
    function VERSION() external view returns (string memory);
}
