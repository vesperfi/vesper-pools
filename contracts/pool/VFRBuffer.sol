// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "../interfaces/vesper/IVesperPool.sol";

contract VFRBuffer {
    address public pool;

    constructor(address _pool) {
        pool = _pool;
    }

    function request(uint256 _amount) public {
        (bool active, , , , , , , ) = IVesperPool(pool).strategy(msg.sender);
        require(active, "invalid-strategy");

        uint256 balance = IVesperPool(pool).token().balanceOf(address(this));
        require(balance >= _amount, "insufficient-balance");
        IVesperPool(pool).token().transfer(msg.sender, _amount);
    }
}
