// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./CompoundLikeStrategy.sol";
import "../../interfaces/token/IToken.sol";

contract BenqiStrategyAVAX is CompoundLikeStrategy {
    //solhint-disable no-empty-blocks
    constructor(
        address _pool,
        address _swapManager,
        address _comptroller,
        address _rewardDistributor,
        address _rewardToken,
        address _receiptToken,
        string memory _name
    ) CompoundLikeStrategy(_pool, _swapManager, _comptroller, _rewardDistributor, _rewardToken, _receiptToken, _name) {}

    function _afterRedeem() internal override {
        TokenLike(WAVAX).deposit{value: address(this).balance}();
    }

    function _reinvest() internal override {
        uint256 _collateralBalance = collateralToken.balanceOf(address(this));
        if (_collateralBalance != 0) {
            TokenLike(WAVAX).withdraw(_collateralBalance);
            cToken.mint{value: _collateralBalance}();
        }
    }
}
