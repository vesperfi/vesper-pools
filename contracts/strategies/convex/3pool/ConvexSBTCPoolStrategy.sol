// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./ConvexStrategy.sol";

//solhint-disable no-empty-blocks
contract ConvexSBTCStrategy is ConvexStrategy {
    address private constant THREEPOOL = 0x7fC77b5c7614E1533320Ea6DDc2Eb61fa00A9714;
    address private constant THREECRV = 0x075b1bb99792c9E1041bA13afEf80C91a1e70fB3;
    address private constant GAUGE = 0x705350c4BcD35c9441419DdD5d2f097d7a55410F;
    // Convex Pool ID for sBTC pool
    uint256 internal constant CONVEX_POOL_ID = 7;
    // No. of pooled tokens in the Pool
    uint256 private constant N = 3;

    constructor(
        address _pool,
        address _swapManager,
        uint256 _collateralIdx,
        string memory _name
    ) ConvexStrategy(_pool, THREEPOOL, THREECRV, GAUGE, _swapManager, _collateralIdx, CONVEX_POOL_ID, N, _name) {
        oracleRouterIdx = 1;
    }
}
