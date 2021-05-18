// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./CompoundStrategy.sol";
import "../../interfaces/token/IToken.sol";

// solhint-disable no-empty-blocks
/// @title Deposit ETH/WETH in Compound and earn interest.
contract CompoundStrategyETH is CompoundStrategy {
    string public constant NAME = "Compound-Strategy-ETH";
    string public constant VERSION = "3.0.0";

    // cETH = 0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5
    constructor(address _pool, address _swapManager)
        CompoundStrategy(_pool, _swapManager, 0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5)
    {}

    /// @dev Only receive ETH from either cToken or WETH
    receive() external payable {
        require(msg.sender == address(cToken) || msg.sender == WETH, "not-allowed-to-send-ether");
    }

    /**
     * @dev This hook get called after collateral is redeemed from Compound
     * Vesper deals in WETH as collateral so convert ETH to WETH
     */
    function _afterRedeem() internal override {
        TokenLike(WETH).deposit{value: address(this).balance}();
    }

    /**
     * @dev During reinvest we have WETH as collateral but Compound accepts ETH.
     * Withdraw ETH from WETH before calling mint in Compound.
     */
    function _reinvest() internal override {
        uint256 _collateralBalance = collateralToken.balanceOf(address(this));
        if (_collateralBalance != 0) {
            TokenLike(WETH).withdraw(_collateralBalance);
            cToken.mint{value: _collateralBalance}();
        }
    }
}
