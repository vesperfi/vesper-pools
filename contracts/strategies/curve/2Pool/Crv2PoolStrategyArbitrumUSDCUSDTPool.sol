// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./Crv2PoolStrategy.sol";

contract Crv2PoolStrategyArbitrumUSDCUSDTPool is Crv2PoolStrategy {
    // USDC/UST LP Token
    address internal constant CRV_LP = 0x7f90122BF0700F9E7e1F688fe926940E8839F353;
    // USDC/UST Pool
    address internal constant CRV_POOL = 0x7f90122BF0700F9E7e1F688fe926940E8839F353;
    // USDC/UST Gauge
    address internal constant GAUGE = 0xbF7E49483881C76487b0989CD7d9A8239B20CA41;

    constructor(
        address _pool,
        address _swapManager,
        uint256 _collateralIdx,
        string memory _name
    ) Crv2PoolStrategy(_pool, _swapManager, CRV_POOL, CRV_LP, GAUGE, _collateralIdx, _name) {
        WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
        CRV = 0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978;
        reservedToken[CRV] = true;
    }

    function _claimCrv() internal override {
        ILiquidityGaugeV3(crvGauge).claim_rewards(address(this));
    }

    function claimableRewards() public view virtual override returns (uint256) {
        return ILiquidityGaugeV3(crvGauge).claimable_reward(address(this), CRV);
    }
}
