// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./ConvexCoverageStrategy.sol";
import "../3pool/Convex3PoolStrategy.sol";

//solhint-disable no-empty-blocks
contract ConvexCoverage3poolStrategy is ConvexCoverageStrategy {
    address private constant THREEPOOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    address private constant THREECRV = 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;
    address private constant GAUGE = 0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A;
    // Convex Pool ID for 3Pool
    uint256 private constant CONVEX_POOL_ID = 9;

    constructor(
        address _pool,
        address _swapManager,
        uint256 _collateralIdx,
        string memory _name
    ) ConvexCoverageStrategy(_pool, THREEPOOL, THREECRV, GAUGE, _swapManager, _collateralIdx, CONVEX_POOL_ID, _name) {}
}
