// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../../interfaces/vesper/IVesperPool.sol";
import "../../../interfaces/aave/IAave.sol";
import "../../Strategy.sol";
import "../3Pool/Crv3PoolStrategy.sol";

/// @title This strategy will deposit collateral token in Curve 3Pool and earn interest.
abstract contract CrvA3PoolStrategy is Crv3PoolStrategyBase {
    using SafeERC20 for IERC20;
    address private constant CRV_POOL = 0xDeBF20617708857ebe4F679508E7b7863a8A8EeE;
    address private constant LP = 0xFd2a8fA60Abd58Efe3EeE34dd494cD491dC14900;
    address private constant GAUGE = 0xd662908ADA2Ea1916B3318327A97eB18aD588b5d;
    address private constant STKAAVE = 0x4da27a545c0c5B758a6BA100e3a049001de870f5;
    address private constant AAVE = 0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9;

    constructor(
        address _pool,
        address _swapManager,
        uint256 _collateralIdx
    ) Crv3PoolStrategyBase(_pool, CRV_POOL, LP, GAUGE, _swapManager, _collateralIdx) {
        require(IStableSwap3xUnderlying(CRV_POOL).lp_token() == LP, "receipt-token-mismatch");
        require(
            IStableSwap3xUnderlying(CRV_POOL).underlying_coins(_collateralIdx) == address(IVesperPool(_pool).token()),
            "collateral-mismatch"
        );
        reservedToken[AAVE] = true;
        reservedToken[STKAAVE] = true;
    }

    function canStartCooldown() public view returns (bool) {
        (uint256 _cooldownStart, , uint256 _unstakeEnd) = cooldownData();
        return _canStartCooldown(_cooldownStart, _unstakeEnd);
    }

    function canUnstake() external view returns (bool) {
        (, uint256 _cooldownEnd, uint256 _unstakeEnd) = cooldownData();
        return _canUnstake(_cooldownEnd, _unstakeEnd);
    }

    function cooldownData()
        public
        view
        returns (
            uint256 _cooldownStart,
            uint256 _cooldownEnd,
            uint256 _unstakeEnd
        )
    {
        _cooldownStart = StakedAave(STKAAVE).stakersCooldowns(address(this));
        _cooldownEnd = _cooldownStart + StakedAave(STKAAVE).COOLDOWN_SECONDS();
        _unstakeEnd = _cooldownEnd + StakedAave(STKAAVE).UNSTAKE_WINDOW();
    }

    function _claimRewardsAndConvertTo(address _toToken) internal override {
        require(_toToken == address(collateralToken), "invalid-toToken");
        _claimCrv();
        _claimStkAAVE();
        uint256 amtCrv = IERC20(CRV).balanceOf(address(this));
        if (amtCrv != 0) {
            (uint256 minWethOut, bool isValid) = _consultOracle(CRV, WETH, amtCrv);
            (uint256 minAmtOut, bool isValidTwo) = _consultOracle(WETH, _toToken, minWethOut);
            require(isValid, "stale-crv-oracle");
            require(isValidTwo, "stale-collateral-oracle");
            _safeSwap(CRV, _toToken, amtCrv, _calcAmtOutAfterSlippage(minAmtOut, swapSlippage));
        }
        _claimAave();
        uint256 amtAave = IERC20(AAVE).balanceOf(address(this));
        if (amtAave != 0) {
            (uint256 minWethOut, bool isValid) = _consultOracle(AAVE, WETH, amtAave);
            (uint256 minAmtOut, bool isValidTwo) = _consultOracle(WETH, _toToken, minWethOut);
            require(isValid, "stale-crv-oracle");
            require(isValidTwo, "stale-collateral-oracle");
            _safeSwap(AAVE, _toToken, amtAave, _calcAmtOutAfterSlippage(minAmtOut, swapSlippage));
        }
    }

    function _claimStkAAVE() internal {
        ILiquidityGaugeV2(crvGauge).claim_rewards(address(this));
    }

    function _claimAave() internal returns (uint256) {
        (uint256 _cooldownStart, uint256 _cooldownEnd, uint256 _unstakeEnd) = cooldownData();
        if (_canUnstake(_cooldownEnd, _unstakeEnd)) {
            StakedAave(STKAAVE).redeem(address(this), MAX_UINT_VALUE);
        } else if (_canStartCooldown(_cooldownStart, _unstakeEnd)) {
            StakedAave(STKAAVE).cooldown();
        }
        StakedAave(STKAAVE).claimRewards(address(this), MAX_UINT_VALUE);
        return IERC20(AAVE).balanceOf(address(this));
    }

    function _canUnstake(uint256 _cooldownEnd, uint256 _unstakeEnd) internal view returns (bool) {
        return block.timestamp > _cooldownEnd && block.timestamp <= _unstakeEnd;
    }

    function _canStartCooldown(uint256 _cooldownStart, uint256 _unstakeEnd) internal view returns (bool) {
        return
            StakedAave(STKAAVE).balanceOf(address(this)) != 0 && (_cooldownStart == 0 || block.timestamp > _unstakeEnd);
    }

    function _setupOracles() internal override {
        swapManager.createOrUpdateOracle(CRV, WETH, oraclePeriod, oracleRouterIdx);
        swapManager.createOrUpdateOracle(AAVE, WETH, oraclePeriod, oracleRouterIdx);
        for (uint256 i = 0; i < N; i++) {
            swapManager.createOrUpdateOracle(
                IStableSwap3xUnderlying(CRV_POOL).underlying_coins(i),
                WETH,
                oraclePeriod,
                oracleRouterIdx
            );
        }
    }

    // overrides init in Crv3x
    function _init(address _pool) internal override {
        for (uint256 i = 0; i < N; i++) {
            coins[i] = IStableSwap3xUnderlying(_pool).underlying_coins(i);
            coinDecimals[i] = IERC20Metadata(coins[i]).decimals();
        }
    }

    function _approveToken(uint256 _amount) internal override {
        collateralToken.safeApprove(pool, _amount);
        collateralToken.safeApprove(address(crvPool), _amount);
        for (uint256 i = 0; i < swapManager.N_DEX(); i++) {
            IERC20(CRV).safeApprove(address(swapManager.ROUTERS(i)), _amount);
            IERC20(AAVE).safeApprove(address(swapManager.ROUTERS(i)), _amount);
        }
        IERC20(crvLp).safeApprove(crvGauge, _amount);
    }

    function _depositToCurve(uint256 amt) internal override returns (bool) {
        if (amt != 0) {
            uint256[3] memory depositAmounts;
            depositAmounts[collIdx] = amt;
            uint256 minLpAmount =
                ((amt * _getSafeUsdRate()) / crvPool.get_virtual_price()) * 10**(18 - coinDecimals[collIdx]);
            // solhint-disable-next-line no-empty-blocks
            try
                IStableSwap3xUnderlying(address(crvPool)).add_liquidity(depositAmounts, minLpAmount, true)
            {} catch Error(string memory reason) {
                emit DepositFailed(reason);
                return false;
            }
        }
        return true;
    }

    function _withdrawAsFromCrvPool(
        uint256 _lpAmount,
        uint256 _minAmt,
        uint256 i
    ) internal override {
        crvPool.remove_liquidity_one_coin(_lpAmount, SafeCast.toInt128(int256(i)), _minAmt, true);
    }

    function _withdrawAllAs(uint256 i) internal override {
        uint256 lpAmt = IERC20(crvLp).balanceOf(address(this));
        if (lpAmt != 0) {
            crvPool.remove_liquidity_one_coin(lpAmt, SafeCast.toInt128(int256(i)), 0, true);
        }
    }
}
