// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./EarnCrvsBTCStrategy.sol";

//solhint-disable no-empty-blocks
// Earn Curve sBTC Pool WBTC-DAI strategy
contract EarnCrvsBTCStrategyWBTC is EarnCrvsBTCStrategy {
    string public constant NAME = "Earn-Curve-sBTC-WBTC-Strategy";
    string public constant VERSION = "3.0.14";

    constructor(address _pool, address _swapManager)
        EarnCrvsBTCStrategy(
            _pool,
            _swapManager,
            0x6B175474E89094C44Da98b954EedeAC495271d0F // DAI
        )
    {}
}
