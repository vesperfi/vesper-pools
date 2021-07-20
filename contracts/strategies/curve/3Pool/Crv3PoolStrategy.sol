// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../../interfaces/vesper/IVesperPool.sol";
import "../../Strategy.sol";
import "../Crv3x.sol";
import "../Crv3PoolStrategyBase.sol";

/// @title This strategy will deposit collateral token in Curve 3Pool and earn interest.
abstract contract Crv3PoolStrategy is Crv3PoolStrategyBase {
    address private constant THREEPOOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    address private constant THREECRV = 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;
    address private constant GAUGE = 0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A;

    constructor(
        address _pool,
        address _swapManager,
        uint256 _collateralIdx
    ) Crv3PoolStrategyBase(_pool, THREEPOOL, THREECRV, GAUGE, _swapManager, _collateralIdx) {
        require(
            IStableSwap3xUnderlying(THREEPOOL).coins(_collateralIdx) == address(IVesperPool(_pool).token()),
            "collateral-mismatch"
        );
    }
}
