// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

interface IStrategy {
    function rebalance() external;

    function deposit(uint256 _amount) external;

    function depositAll() external;

    function beforeWithdraw() external;

    function withdraw(uint256 _amount) external;

    function withdrawAll() external;

    function isReservedToken(address _token) external view returns (bool);

    function token() external view returns (address);

    function pool() external view returns (address);

    function sweepERC20(address _fromToken) external;

    //Lifecycle functions
    function pause() external;

    function unpause() external;
}
