// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../dependencies/openzeppelin/contracts/token/ERC20/ERC20.sol";

// This is test contract
// solhint-disable no-empty-blocks
contract VSP is ERC20 {
    constructor() ERC20("VesperToken", "VSP") {}

    /// @dev Mint test VSP
    function mint(address _recipient, uint256 _amount) external {
        _mint(_recipient, _amount);
    }
}
