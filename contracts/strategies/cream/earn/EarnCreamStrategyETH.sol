// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./EarnCreamStrategy.sol";
import "../../../interfaces/token/IToken.sol";

// solhint-disable no-empty-blocks
/// @title Deposit ETH/WETH in C.R.E.A.M. and earn interest in DAI.
contract EarnCreamStrategyETH is EarnCreamStrategy {
    string public constant NAME = "Earn-Cream-Strategy-ETH";
    string public constant VERSION = "3.0.5";

    // crETH = 0xD06527D5e56A3495252A528C4987003b712860eE
    // DAI = 0x6b175474e89094c44da98b954eedeac495271d0f
    constructor(address _pool, address _swapManager)
        EarnCreamStrategy(
            _pool,
            _swapManager,
            0xD06527D5e56A3495252A528C4987003b712860eE,
            0x6B175474E89094C44Da98b954EedeAC495271d0F
        )
    {}

    /// @dev Only receive ETH from either cToken or WETH
    receive() external payable {
        require(msg.sender == address(cToken) || msg.sender == WETH, "not-allowed-to-send-ether");
    }

    /**
     * @dev This hook get called after collateral is redeemed from C.R.E.A.M.
     * Vesper deals in WETH as collateral so convert ETH to WETH
     */
    function _afterRedeem() internal override {
        TokenLike(WETH).deposit{value: address(this).balance}();
    }

    /**
     * @dev During reinvest we have WETH as collateral but C.R.E.A.M. accepts ETH.
     * Withdraw ETH from WETH before calling mint in C.R.E.A.M.
     */
    function _reinvest() internal override {
        uint256 _collateralBalance = collateralToken.balanceOf(address(this));
        if (_collateralBalance != 0) {
            TokenLike(WETH).withdraw(_collateralBalance);
            cToken.mint{value: _collateralBalance}();
        }
    }
}
