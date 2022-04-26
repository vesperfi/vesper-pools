// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./../CrvPoolStrategyBase.sol";

// solhint-disable no-empty-blocks

/// @title This strategy will deposit collateral in Avalanche chain Curve avWBTC/renBTC pool
contract Crv2PoolAvaStrategyAvWBTCRenBTC is CrvPoolStrategyBase {
    // avWBTC/renBTC LP Token
    address internal constant CRV_LP = 0xC2b1DF84112619D190193E48148000e3990Bf627;
    // avWBTC/renBTC Pool
    address internal constant CRV_POOL = 0x16a7DA911A4DD1d83F3fF066fE28F3C792C50d90;
    // avWBTC/renBTC Gauge
    address internal constant GAUGE = 0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1;

    // No. of pooled tokens in the Pool
    uint256 private constant N = 2;

    constructor(
        address _pool,
        address _swapManager,
        uint256 _collateralIdx,
        string memory _name
    ) CrvPoolStrategyBase(_pool, CRV_POOL, CRV_LP, GAUGE, _swapManager, _collateralIdx, N, _name) {
        // Overwrite hardcoded mainnet addresses with Avalanche addresses
        CRV = 0x47536F17F4fF30e64A96a7555826b8f9e66ec468;
        WETH = 0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB;
        reservedToken[CRV] = true;
        // Parent contract is adding mainnet rewardTokens, clear those and add Avalanche rewardTokens
        delete rewardTokens;
        rewardTokens.push(CRV);
    }

    function _claimRewards() internal override {
        ILiquidityGaugeV2(crvGauge).claim_rewards(address(this));
    }

    function _depositToCurve(uint256 _amt) internal virtual override returns (bool) {
        if (_amt > 0) {
            uint256[2] memory _depositAmounts;
            _depositAmounts[collIdx] = _amt;
            uint256 _expectedOut =
                _calcAmtOutAfterSlippage(
                    IStableSwap2x(address(crvPool)).calc_token_amount(_depositAmounts, true),
                    crvSlippage
                );
            uint256 _minLpAmount =
                _calcAmtOutAfterSlippage(
                    ((_amt * _getSafeUsdRate()) / crvPool.get_virtual_price()) * 10**(18 - coinDecimals[collIdx]),
                    crvSlippage
                );
            if (_expectedOut > _minLpAmount) {
                _minLpAmount = _expectedOut;
            }
            // NOTICE:: Using 2xUnderlying interface and adding liquidity with use_underlying = true flag
            try
                IStableSwap2xUnderlying(address(crvPool)).add_liquidity(_depositAmounts, _minLpAmount, true)
            {} catch Error(string memory reason) {
                emit DepositFailed(reason);
                return false;
            }
        }
        return true;
    }

    /// @dev Claimable rewards estimated into pool's collateral value
    function estimateClaimableRewardsInCollateral() public view virtual override returns (uint256 rewardAsCollateral) {
        uint256 _claimable;
        for (uint256 i = 0; i < rewardTokens.length; i++) {
            _claimable = ILiquidityGaugeV3(crvGauge).claimable_reward(address(this), rewardTokens[i]);
            if (_claimable > 0) {
                (, uint256 _reward, ) =
                    swapManager.bestOutputFixedInput(rewardTokens[i], address(collateralToken), _claimable);
                rewardAsCollateral += _reward;
            }
        }
    }

    function _init(address _crvPool, uint256 _n) internal virtual override {
        for (uint256 i = 0; i < _n; i++) {
            // NOTICE:: We are using underlying_coins(). It is available in base interface so any interface is fine.
            address _underlying = IStableSwapUnderlying(_crvPool).underlying_coins(i);
            coins.push(_underlying);
            coinDecimals.push(IERC20Metadata(_underlying).decimals());
        }
    }

    function _withdrawAllAs(uint256 i) internal override {
        uint256 lpAmt = IERC20(crvLp).balanceOf(address(this));
        if (lpAmt > 0) {
            // NOTICE:: using use_underlying = true flag for withdrawing underlying
            crvPool.remove_liquidity_one_coin(lpAmt, SafeCast.toInt128(int256(i)), 0, true);
        }
    }

    function _withdrawAsFromCrvPool(
        uint256 _lpAmount,
        uint256 _minAmt,
        uint256 i
    ) internal override {
        // NOTICE:: using use_underlying = true flag for withdrawing underlying
        crvPool.remove_liquidity_one_coin(_lpAmount, SafeCast.toInt128(int256(i)), _minAmt, true);
    }
}
