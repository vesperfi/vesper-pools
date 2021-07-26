// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../strategies/curve/Crv3x.sol";

contract Crv3PoolMock is Crv3x {
    /* solhint-disable */
    using SafeERC20 for IERC20;
    address public constant THREEPOOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    address private constant THREECRV = 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;
    address private constant GAUGE = 0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A;

    constructor() Crv3x(THREEPOOL, THREECRV, GAUGE) {}

    /* solhint-enable */

    function _depositToCrvPool(
        uint256 _daiAmount,
        uint256 _usdcAmount,
        uint256 _usdtAmount
    ) internal {
        uint256[3] memory depositAmounts = [_daiAmount, _usdcAmount, _usdtAmount];
        // using 1 for min_mint_amount, but we may want to improve this logic
        IStableSwap3xUnderlying(address(crvPool)).add_liquidity(depositAmounts, 1);
    }

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
        _stakeAllLp();
    }

    function unstakeAllLp() external {
        _unstakeAllLp();
    }

    function unstakeLp(uint256 _amount) external {
        _unstakeLp(_amount);
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
        IERC20(_token).safeApprove(address(crvPool), 0);
        IERC20(_token).safeApprove(address(crvPool), type(uint256).max);
    }

    function minimumLpPrice(uint256 _safeRate) external view returns (uint256) {
        return _minimumLpPrice(_safeRate);
    }
}
