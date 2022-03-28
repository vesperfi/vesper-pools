// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./CompoundLeverageAvalancheStrategy.sol";
import "../../interfaces/token/IToken.sol";

contract BenqiCompoundLeverageAvalancheStrategyAVAX is CompoundLeverageAvalancheStrategy {
    //solhint-disable no-empty-blocks
    constructor(
        address _pool,
        address _swapManager,
        address _comptroller,
        address _rewardDistributor,
        address _rewardToken,
        address _aaveAddressProvider,
        address _receiptToken,
        string memory _name
    )
        CompoundLeverageAvalancheStrategy(
            _pool,
            _swapManager,
            _comptroller,
            _rewardDistributor,
            _rewardToken,
            _aaveAddressProvider,
            _receiptToken,
            _name
        )
    {}

    function _mint(uint256 _amount) internal override {
        _withdrawETH(_amount);
        cToken.mint{value: _amount}();
    }

    function _redeemUnderlying(uint256 _amount) internal override {
        super._redeemUnderlying(_amount);
        _depositETH();
    }

    function _borrowCollateral(uint256 _amount) internal override {
        super._borrowCollateral(_amount);
        _depositETH();
    }

    function _repayBorrow(uint256 _amount) internal override {
        _withdrawETH(_amount);
        cToken.repayBorrow{value: _amount}();
    }

    function _depositETH() internal {
        TokenLike(WETH).deposit{value: address(this).balance}();
    }

    function _withdrawETH(uint256 _amount) internal {
        TokenLike(WETH).withdraw(_amount);
    }
}
