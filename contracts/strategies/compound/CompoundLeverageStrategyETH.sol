// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./CompoundLeverageStrategy.sol";
import "../../interfaces/token/IToken.sol";

// solhint-disable no-empty-blocks
/// @title Deposit ETH in Compound and earn interest.
contract CompoundLeverageStrategyETH is CompoundLeverageStrategy {
    string public constant NAME = "Compound-Leverage-Strategy-ETH";
    string public constant VERSION = "3.0.12";

    // cETH = 0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5
    constructor(address _pool, address _swapManager)
        CompoundLeverageStrategy(_pool, _swapManager, 0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5)
    {}

    /// @dev Only receive ETH from either cToken or WETH
    receive() external payable {
        require(msg.sender == address(cToken) || msg.sender == WETH, "not-allowed-to-send-ether");
    }

    /// @dev Compound support ETH as collateral. Convert WETH to ETH and mint cETH
    function _mint(uint256 _amount) internal override {
        _withdrawETH(_amount);
        cToken.mint{value: _amount}();
    }

    /// @dev On redeem we will receive ETH. Convert received ETH into WETH
    function _redeemUnderlying(uint256 _amount) internal override {
        super._redeemUnderlying(_amount);
        _depositETH();
    }

    /// @dev On borrow we will receive ETH. Convert received ETH into WETH
    function _borrowCollateral(uint256 _amount) internal override {
        super._borrowCollateral(_amount);
        _depositETH();
    }

    /// @dev Repay will take ETH. Convert WETH to ETH and call payable repay function
    function _repayBorrow(uint256 _amount) internal override {
        _withdrawETH(_amount);
        cToken.repayBorrow{value: _amount}();
    }

    /// @dev Deposit ETH and get WETH in return
    function _depositETH() internal {
        TokenLike(WETH).deposit{value: address(this).balance}();
    }

    /// @dev Withdraw ETH by burning similar amount of WETH
    function _withdrawETH(uint256 _amount) internal {
        TokenLike(WETH).withdraw(_amount);
    }
}
