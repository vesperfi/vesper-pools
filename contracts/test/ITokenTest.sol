// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface TokenLikeTest is IERC20 {
    function deposit() external payable;

    function withdraw(uint256) external;

    function decimals() external view returns (uint256);
}
