// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../strategies/curve/Crv3PoolMgr.sol";

contract Crv3PoolMock is Crv3PoolMgr {
    /* solhint-disable */
    using SafeERC20 for IERC20;

    constructor() Crv3PoolMgr() {}

    /* solhint-enable */

    function depositToCrvPool(
        uint256 _daiAmount,
        uint256 _usdcAmount,
        uint256 _usdtAmount
    ) external {
        _depositToCrvPool(_daiAmount, _usdcAmount, _usdtAmount);
    }

    function withdrawAsFromCrvPool(
        uint256 _lpAmount,
        uint256 _minDai,
        uint256 i
    ) external {
        _withdrawAsFromCrvPool(_lpAmount, _minDai, i);
    }

    function withdrawAllAs(uint256 i) external {
        _withdrawAllAs(i);
    }

    function stakeAllLpToGauge() external {
        _stakeAllLpToGauge();
    }

    function unstakeAllLpFromGauge() external {
        _unstakeAllLpFromGauge();
    }

    function unstakeLpFromGauge(uint256 _amount) external {
        _unstakeLpFromGauge(_amount);
    }

    function claimCrv() external {
        _claimCrv();
    }

    // if using this contract on its own.
    function approveLpForGauge() external {
        IERC20(crvLp).safeApprove(crvGauge, 0);
        IERC20(crvLp).safeApprove(crvGauge, type(uint256).max);
    }

    // if using this contract on its own.
    function approveTokenForPool(address _token) external {
        IERC20(_token).safeApprove(crvPool, 0);
        IERC20(_token).safeApprove(crvPool, type(uint256).max);
    }

    function minimumLpPrice(uint256 _safeRate) external view returns (uint256) {
        return _minimumLpPrice(_safeRate);
    }
}
