// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./VTokenBase.sol";

//solhint-disable no-empty-blocks
contract VLINK is VTokenBase {
    string public constant VERSION = "3.0.0";

    // LINK = 0x514910771AF9Ca656af840dff83E8264EcF986CA
    constructor() VTokenBase("vLINK Pool", "vLINK", 0x514910771AF9Ca656af840dff83E8264EcF986CA) {}
}
