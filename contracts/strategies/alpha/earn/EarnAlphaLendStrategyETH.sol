// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./EarnAlphaLendStrategy.sol";
import "../../../interfaces/token/IToken.sol";

// solhint-disable no-empty-blocks
/// @title Deposit ETH/WETH in Alpha Lend and earn interest in DAI.
contract EarnAlphaLendStrategyETH is EarnAlphaLendStrategy {
    string public constant NAME = "Earn-Alpha-Lend-Strategy-ETH";
    string public constant VERSION = "3.0.5";

    TokenLike internal constant WETH_TOKEN = TokenLike(WETH);

    // ibETHv2 = 0xeEa3311250FE4c3268F8E684f7C87A82fF183Ec1
    // DAI = 0x6b175474e89094c44da98b954eedeac495271d0f
    constructor(address _pool, address _swapManager)
        EarnAlphaLendStrategy(
            _pool,
            _swapManager,
            0xeEa3311250FE4c3268F8E684f7C87A82fF183Ec1, // ibETHv2
            0x6B175474E89094C44Da98b954EedeAC495271d0F // DAI
        )
    {}

    receive() external payable {
        require((_msgSender() == address(safeBox)) || (_msgSender() == WETH), "invalid-eth-sender");
    }

    function _setupCheck(address _pool) internal view override {
        require(address(IVesperPool(_pool).token()) == WETH, "u-token-mismatch");
    }

    function claimUTokenReward(uint256 amount, bytes32[] memory proof) external override onlyKeeper {
        safeBox.claim(amount, proof);
        uint256 _uBalance = address(this).balance;
        WETH_TOKEN.deposit{value: _uBalance}();
        _convertCollateralToDrip(_uBalance);
        _forwardEarning();
    }

    /// @notice Deposit collateral in Alpha
    function _reinvest() internal override {
        uint256 _collateralBalance = collateralToken.balanceOf(address(this));
        if (_collateralBalance != 0) {
            WETH_TOKEN.withdraw(_collateralBalance);
            safeBox.deposit{value: _collateralBalance}();
        }
    }

    function _afterDownstreamWithdrawal() internal override {
        WETH_TOKEN.deposit{value: address(this).balance}();
    }
}
