// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "../strategies/curve/Crv3PoolMgr.sol";

contract Crv3PoolMock is Crv3PoolMgr {
    /* solhint-disable */
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

    function setCheckpoint() external {
        _setCheckpoint();
    }
}
