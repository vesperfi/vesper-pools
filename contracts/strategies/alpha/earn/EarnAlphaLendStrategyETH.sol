// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./EarnAlphaLendStrategy.sol";
import "../../../interfaces/token/IToken.sol";

// solhint-disable no-empty-blocks
/// @title Deposit ETH/WETH in Alpha Lend and earn interest in DAI.
contract EarnAlphaLendStrategyETH is EarnAlphaLendStrategy {
    TokenLike internal constant WETH_TOKEN = TokenLike(WETH);

    constructor(
        address _pool,
        address _swapManager,
        address _receiptToken,
        address _dripToken,
        string memory _name
    ) EarnAlphaLendStrategy(_pool, _swapManager, _receiptToken, _dripToken, _name) {}

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
