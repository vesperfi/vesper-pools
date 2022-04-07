// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;
import "../dependencies/openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface TokenLikeTest is IERC20Metadata {
    function deposit() external payable;

    function withdraw(uint256) external;
}
