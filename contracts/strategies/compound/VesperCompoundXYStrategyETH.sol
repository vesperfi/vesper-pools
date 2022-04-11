// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./VesperCompoundXYStrategy.sol";
import "../../interfaces/vesper/IVesperPool.sol";
import "../../interfaces/vesper/IPoolRewards.sol";

// solhint-disable no-empty-blocks
/// @title Deposit ETH in Compound and earn interest by depositing borrowed token in a Vesper Pool.
contract VesperCompoundXYStrategyETH is VesperCompoundXYStrategy {
    using SafeERC20 for IERC20;

    constructor(
        address _pool,
        address _swapManager,
        address _comptroller,
        address _rewardDistributor,
        address _rewardToken,
        address _receiptToken,
        address _borrowCToken,
        address _vPool,
        address _vspAddress,
        string memory _name
    )
        VesperCompoundXYStrategy(
            _pool,
            _swapManager,
            _comptroller,
            _rewardDistributor,
            _rewardToken,
            _receiptToken,
            _borrowCToken,
            _vPool,
            _vspAddress,
            _name
        )
    {}

    /// @dev Unwrap ETH and supply in Compound
    function _mintX(uint256 _amount) internal override {
        if (_amount > 0) {
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
