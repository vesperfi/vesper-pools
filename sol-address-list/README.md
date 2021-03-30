[![Action Status](https://github.com/bloq/sol-address-list/workflows/Address%20List/badge.svg)](https://github.com/bloq/sol-address-list/actions)

# address-list

## Summary

This is a simple list of admin-controlled addresses, forming an
```
        (address -> uint256 metadata)
```
on-chain mapping data type.

## Overview

The primary uses include governance, on-chain security, creating on-chain filtering lists, or creating
contract<->contract proxy routes.  A key motivation was mirroring
the off-chain [Token Lists](https://uniswap.org/blog/token-lists/)
with similar on-chain infrastructure.

Anybody may create and administer their own token list ("AddressList"),
using a provided factory contract.

Beyond the usual whitelist filtering, on-chain token lists can be used
to publish personal token lists, a list of all tokens in the Compound,
Synthetix or Yearn universe, and more.

## Features

* Fast
* O(1) queries, addition and removal
* Admin-specified **metadata** value associated with each address.  uint256.  Cannot be zero.
* Role-based access control (RBAC), to separate list admin duties
  from list owner.

## Metadata

As described in the summary, an AddressList is an on-chain
(address,uint256) mapping utility.

In the simple case, the metadata value is set to one (1), to indicate
presence in the set of addresses.

In more complex examples, this can be used in forwarding and proxy
scenarios as an on-chain (address,address) mapping, or even an on-chain
(uint256,address) mapping if you don't mind a few ugly casts.

The only requirements are that both key (address) and value (uint256)
must be non-zero.

## Role in governance

One use case for AddressList is as a administered list, for an otherwise
decentralized system.   For example, a permissionless asset management
system, with no owner, that relies on a administered token whitelist
provided by AddressList.  The gateway into this example system is
provided by an administrative multi-sig or DAO managing a list of
token addresses.

## Administration

Token lists are administered by a list administrator, so delegated 
to the `LIST_ADMIN` role.  This is initially the contract owner - the
Ethereum account that called the factory contract.

See the [OpenZeppelin RBAC documentation](https://docs.openzeppelin.com/contracts/3.x/access-control#role-based-access-control) for further information
about administering roles.

