// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

/* solhint-disable no-empty-blocks */

import "./AlphaLendStrategy.sol";

/// @title Deposit USDT in Alpha and earn interest.
contract AlphaLendStrategyUSDT is AlphaLendStrategy {
    string public constant NAME = "Alpha-Lend-Strategy-USDT";
    string public constant VERSION = "3.0.0";

    // ibUSDTv2 = 0x020eDC614187F9937A1EfEeE007656C6356Fb13A
    constructor(address _pool, address _swapManager)
        AlphaLendStrategy(_pool, _swapManager, 0x020eDC614187F9937A1EfEeE007656C6356Fb13A)
    {}
}
