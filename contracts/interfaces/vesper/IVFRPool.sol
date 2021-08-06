// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

interface IVFRPool {
    function targetPricePerShare() external view returns (uint256);

    function amountToReachTarget(address _strategy) external view returns (uint256);
}
