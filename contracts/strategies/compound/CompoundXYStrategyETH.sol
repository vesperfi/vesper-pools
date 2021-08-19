// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./CompoundXYStrategy.sol";
import "../../interfaces/token/IToken.sol";

// solhint-disable no-empty-blocks
/// @title Deposit ETH/WETH in Compound and earn interest.
contract CompoundXYStrategyETH is CompoundXYStrategy {
    string public constant NAME = "Compound-XY-Strategy-ETH";
    string public constant VERSION = "3.0.12";

    // cETH = 0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5
    // cWBTC2 = 0xccF4429DB6322D5C611ee964527D42E5d685DD6a
    constructor(address _pool, address _swapManager)
        CompoundXYStrategy(
            _pool,
            _swapManager,
            0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5,
            0xccF4429DB6322D5C611ee964527D42E5d685DD6a
        )
    {}

    /// @dev Only receive ETH from either cToken or WETH
    receive() external payable {
        require(msg.sender == address(supplyCToken) || msg.sender == WETH, "not-allowed-to-send-ether");
    }

    /**
     * @dev This hook get called after collateral is redeemed from Compound
     * Vesper deals in WETH as collateral so convert ETH to WETH
     */
    function _afterRedeem() internal override {
        TokenLike(WETH).deposit{value: address(this).balance}();
    }

    /**
     * @dev Compound support ETH as collateral. Convert WETH to ETH and mint cETH
     * @dev Compound mint() for ETH has no return value
     */
    function _mint(uint256 _amount) internal override returns (uint256) {
        if (_amount != 0) {
            TokenLike(WETH).withdraw(_amount);
            supplyCToken.mint{value: _amount}();
        }
        return 0;
    }
}
