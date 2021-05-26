// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./CreamStrategy.sol";
import "../../interfaces/token/IToken.sol";

// solhint-disable no-empty-blocks
/// @title Deposit ETH/WETH in C.R.E.A.M. and earn interest.
contract CreamStrategyETH is CreamStrategy {
    string public constant NAME = "Cream-Strategy-ETH";
    string public constant VERSION = "3.0.0";

    // crETH = 0xD06527D5e56A3495252A528C4987003b712860eE
    constructor(address _pool, address _swapManager)
        CreamStrategy(_pool, _swapManager, 0xD06527D5e56A3495252A528C4987003b712860eE)
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
     * @dev During reinvest we have WETH as collateral but Cream accepts ETH.
     * Withdraw ETH from WETH before calling mint in Cream.
     */
    function _reinvest() internal override {
        uint256 _collateralBalance = collateralToken.balanceOf(address(this));
        if (_collateralBalance != 0) {
            TokenLike(WETH).withdraw(_collateralBalance);
            cToken.mint{value: _collateralBalance}();
        }
    }
}
