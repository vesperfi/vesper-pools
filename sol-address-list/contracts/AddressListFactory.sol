// SPDX-License-Identifier: MIT

pragma solidity ^0.6.6;

import "./interfaces/IAddressListFactory.sol";
import "./AddressList.sol";

contract AddressListFactory is IAddressListFactory {
    address[] private allLists;
    mapping(address => bool) private isOurs;

    function ours(address a) external view override returns (bool) {
        return isOurs[a];
    }

    function listCount() external view override returns (uint256) {
        return allLists.length;
    }

    function listAt(uint256 idx) external view override returns (address) {
        require(idx < allLists.length, "Index exceeds list length");
        return allLists[idx];
    }

    function createList() external override returns (address listaddr) {
        // create new address list contract
        listaddr = address(new AddressList(msg.sender));

        // note our creation
        allLists.push(listaddr);
        isOurs[listaddr] = true;

        // log our creation
        emit ListCreated(msg.sender, listaddr);
    }
}
