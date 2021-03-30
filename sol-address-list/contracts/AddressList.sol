// SPDX-License-Identifier: MIT

pragma solidity ^0.6.6;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IAddressList.sol";
import "./EnumerableMap.sol";

contract AddressList is AccessControl, IAddressList {
    using EnumerableMap for EnumerableMap.AddressToUintMap;
    EnumerableMap.AddressToUintMap private theList;

    bytes32 public constant LIST_ADMIN = keccak256("LIST_ADMIN");

    modifier onlyListAdmin() {
        require(hasRole(LIST_ADMIN, msg.sender), "Sender lacks LIST_ADMIN role");
        _;
    }

    // initialize owner and list-admin roles
    constructor(address owner) public {
        _setupRole(DEFAULT_ADMIN_ROLE, owner);
        _setupRole(LIST_ADMIN, owner);
    }

    ///////////////////////////////////////////////////////////////

    // Anyone: query list entry at index N (no ordering guarantees)
    function at(uint256 index) external view override returns (address, uint256) {
        return theList.at(index);
    }

    // Anyone: check list contains given address or.
    function contains(address a) external view override returns (bool) {
        return theList.contains(a);
    }
    
    // Anyone: total list length
    function length() external view override returns (uint256) {
        return theList.length();
    }

    // Anyone: query value associated with address.  returns zero if absent.
    function get(address a) external view override returns (uint256) {
        return theList.contains(a) ? theList.get(a) : 0;
    }

    ///////////////////////////////////////////////////////////////

    // Admin: add (address,1) to list
    function add(address a) external override onlyListAdmin returns (bool) {
        return _add(a, 1);
    }

    // Admin: add (address, n) to list
    function addValue(address a, uint256 v) external override onlyListAdmin returns (bool) {
        return _add(a, v);
    }

    // Admin: add multiple (address,1) items to list
    function addMulti(address[] calldata addrs) external override onlyListAdmin returns (uint256) {
        uint256 updated = 0;
        for (uint256 i = 0; i < addrs.length; i++) {
            if (_add(addrs[i], 1))
                updated++;
        }
        return updated;
    }

    // Admin: add multiple (address,n) items to list
    function addValueMulti(address[] calldata addrs, uint256[] calldata values) external override onlyListAdmin returns (uint256) {
        require(addrs.length == values.length, "Address and value array sizes must be equal");
        uint256 updated = 0;
        for (uint256 i = 0; i < addrs.length; i++) {
            if (_add(addrs[i], values[i]))
                updated++;
        }
        return updated;
    }

    // Admin: remove address from list
    function remove(address a) external override onlyListAdmin returns (bool) {
        return _remove(a);
    }

    // Admin: remove multiple items from list
    function removeMulti(address[] calldata addrs) external override onlyListAdmin returns (uint256) {
        uint256 updated = 0;
        for (uint256 i = 0; i < addrs.length; i++) {
            if (_remove(addrs[i]))
                updated++;
        }
        return updated;
    }

    ///////////////////////////////////////////////////////////////

    function _add(address a, uint256 v) private returns (bool) {
        require(v != 0, "Metadata value v cannot be zero");
        if (!theList.contains(a) || theList.get(a) != v) {
            theList.set(a, v);
            emit AddressUpdated(a, msg.sender);
            return true;
        }

        return false;
    }

    function _remove(address a) private returns (bool) {
        bool removed = theList.remove(a);
        if (removed) {
            emit AddressRemoved(a, msg.sender);
            return true;
        }

        return false;
    }
}
