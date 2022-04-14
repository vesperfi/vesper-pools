// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;
import "../../dependencies/openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IVSP is IERC20 {
    function mint(address _recipient, uint256 _amount) external;

    function owner() external view returns (address);
}
