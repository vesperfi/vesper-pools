// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./CompoundXYStrategy.sol";

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

    /// @dev Unwrap ETH and supply in Compound
    function _mintX(uint256 _amount) internal override {
        if (_amount != 0) {
            TokenLike(WETH).withdraw(_amount);
            supplyCToken.mint{value: _amount}();
        }
    }

    /// @dev Withdraw ETH from Compound and Wrap those as WETH
    function _redeemX(uint256 _amount) internal override {
        super._redeemX(_amount);
        TokenLike(WETH).deposit{value: address(this).balance}();
    }
}
