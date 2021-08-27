// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../interfaces/vesper/IVFRBuffer.sol";
import "../interfaces/vesper/IVFRCoveragePool.sol";
import "../interfaces/vesper/IVFRStablePool.sol";

abstract contract VFR {
    using SafeERC20 for IERC20;

    /// @dev This method assumes that _amount < _profitOfStrategy
    function _transferProfit(
        IERC20 _token,
        address _to,
        uint256 _amount
    ) internal virtual returns (uint256) {
        _token.safeTransfer(_to, _amount);
        return _amount;
    }

    function _handleStableProfit(address _stablePool, uint256 _stableProfit) internal returns (uint256 _profit) {
        IERC20 collateralToken = IVFRStablePool(_stablePool).token();
        _profit = _stableProfit;

        // If the buffer is not set, this will work exactly like a regular strategy
        address buffer = IVFRStablePool(_stablePool).buffer();
        if (buffer != address(0)) {
            uint256 targetAmount = IVFRStablePool(_stablePool).amountToReachTarget(address(this));
            if (_profit > targetAmount) {
                _profit -= _transferProfit(collateralToken, buffer, _profit - targetAmount);
            } else {
                uint256 amountNeeded = targetAmount - _profit;
                if (amountNeeded > 0) {
                    uint256 amountInBuffer = collateralToken.balanceOf(buffer);
                    uint256 amountReceived = amountInBuffer >= amountNeeded ? amountNeeded : amountInBuffer;
                    IVFRBuffer(buffer).request(amountReceived);
                    _profit += amountReceived;
                }
            }
        }
    }

    function _handleCoverageProfit(address _coveragePool, uint256 _coverageProfit) internal returns (uint256 _profit) {
        IERC20 collateralToken = IVFRCoveragePool(_coveragePool).token();
        _profit = _coverageProfit;

        // If the buffer is not set, this will work exactly like a regular strategy
        address buffer = IVFRCoveragePool(_coveragePool).buffer();
        if (buffer != address(0)) {
            uint256 target = IVFRBuffer(buffer).target();
            uint256 inBuffer = collateralToken.balanceOf(buffer);
            if (inBuffer > target) {
                // If the buffer is above target, then request any additional funds
                IVFRBuffer(buffer).request(inBuffer - target);
                _profit += (inBuffer - target);
            } else {
                // If the buffer is below target, send funds to it
                uint256 needed = target - inBuffer;
                if (needed > 0) {
                    if (_profit >= needed) {
                        _profit -= _transferProfit(collateralToken, buffer, needed);
                    } else if (_profit > 0) {
                        _profit -= _transferProfit(collateralToken, buffer, _profit);
                    }
                }
            }
        }
    }
}
