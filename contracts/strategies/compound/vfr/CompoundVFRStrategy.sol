// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "../CompoundStrategy.sol";
import "../../../interfaces/vesper/IVFRBuffer.sol";
import "../../../interfaces/vesper/IVFRPool.sol";

// solhint-disable no-empty-blocks
abstract contract CompoundVFRStrategy is CompoundStrategy {
    // This should probably get passed in the constructor, but for now
    // keepping it here so that setup scripts don't need to get updated
    address public buffer;

    constructor(
        address _pool,
        address _swapManager,
        address _receiptToken
    ) CompoundStrategy(_pool, _swapManager, _receiptToken) {}

    function setBuffer(address _buffer) external onlyGovernor {
        buffer = _buffer;
    }

    function _realizeProfit(uint256 _totalDebt) internal virtual override returns (uint256) {
        _claimRewardsAndConvertTo(address(collateralToken));
        uint256 _collateralBalance = _convertToCollateral(cToken.balanceOf(address(this)));
        if (_collateralBalance > _totalDebt) {
            _withdrawHere(_collateralBalance - _totalDebt);
        }

        uint256 balance = collateralToken.balanceOf(address(this));
        uint256 targetAmount = IVFRPool(pool).amountToReachTarget(address(this));
        if (buffer != address(0)) {
            if (balance >= targetAmount) {
                collateralToken.transfer(buffer, balance - targetAmount);
                balance = targetAmount;
            } else {
                uint256 amountNeeded = targetAmount - balance;
                uint256 amountInBuffer = collateralToken.balanceOf(buffer);
                uint256 amountReceived = amountInBuffer >= amountNeeded ? amountNeeded : amountInBuffer;
                IVFRBuffer(buffer).request(amountReceived);
                balance = balance + amountReceived;
            }
        }
        return balance;
    }
}
