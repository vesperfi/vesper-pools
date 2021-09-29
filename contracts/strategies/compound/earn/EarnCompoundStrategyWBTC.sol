// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./EarnCompoundStrategy.sol";
import "../../../interfaces/token/IToken.sol";

// solhint-disable no-empty-blocks
/// @title Deposit WBTC in Compound and earn interest in DAI.
contract EarnCompoundStrategyWBTC is EarnCompoundStrategy {
    string public constant NAME = "Earn-Compound-Strategy-WBTC";
    string public constant VERSION = "3.0.5";

    // cWBTC = 0xccF4429DB6322D5C611ee964527D42E5d685DD6a
    // DAI = 0x6b175474e89094c44da98b954eedeac495271d0f
    constructor(address _pool, address _swapManager)
        EarnCompoundStrategy(
            _pool,
            _swapManager,
            0xccF4429DB6322D5C611ee964527D42E5d685DD6a,
            0x6B175474E89094C44Da98b954EedeAC495271d0F
        )
    {}
}
