// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./VTokenBase.sol";

//solhint-disable no-empty-blocks
contract VDAI is VTokenBase {
    string public constant VERSION = "3.0.0";

    // DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F
    constructor() VTokenBase("vDAI Pool", "vDAI", 0x6B175474E89094C44Da98b954EedeAC495271d0F) {}
}
