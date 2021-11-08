// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../../interfaces/vesper/IVesperPool.sol";
import "../../Strategy.sol";
import "../CrvPoolStrategyBase.sol";

/// @title This strategy will deposit collateral token in Curve a 4Pool Metapool and earn interest.
abstract contract Crv4MetaPoolStrategy is CrvPoolStrategyBase {
    using SafeERC20 for IERC20;

    // No. of pooled tokens in the metapool
    uint256 private constant N = 4;
    // Curve Metapool Factory
    address private constant FACTORY = 0x0959158b6040D32d04c301A72CBFD6b39E21c9AE;
    // Curve DepositZap Contract
    address private constant DEPOSIT_ZAP = 0xA79828DF1850E8a3A3064576f380D90aECDD3359;

    constructor(
        address _pool,
        address _swapManager,
        address _metapool,
        address _gauge,
        uint256 _collateralIdx
    ) CrvPoolStrategyBase(_pool, _metapool, _metapool, _gauge, _swapManager, _collateralIdx, N) {
        address[8] memory _coins = IMetapoolFactory(FACTORY).get_underlying_coins(_metapool);

        require(ILiquidityGaugeV2(_gauge).lp_token() == _metapool, "invalid-gauge");

        uint256 _rewardsCount = ILiquidityGaugeV2(_gauge).reward_count();

        for (uint256 i = 0; i < _rewardsCount; i++) {
            reservedToken[ILiquidityGaugeV2(_gauge).reward_tokens(i)] = true;
        }

        require(_coins[_collateralIdx] == address(IVesperPool(_pool).token()), "collateral-mismatch");
    }

    function _init(
        address _crvPool,
        uint256 /* _n */
    ) internal virtual override {
        coins = IMetapoolFactory(FACTORY).get_underlying_coins(_crvPool);
        coinDecimals = IMetapoolFactory(FACTORY).get_underlying_decimals(_crvPool);
    }

    function _approveToken(uint256 _amount) internal virtual override {
        super._approveToken(_amount);
        uint256 _rewardsCount = ILiquidityGaugeV2(crvGauge).reward_count();
        for (uint256 i = 0; i < _rewardsCount; i++) {
            address _rewardToken = ILiquidityGaugeV2(crvGauge).reward_tokens(i);
            for (uint256 j = 0; j < swapManager.N_DEX(); j++) {
                IERC20(_rewardToken).safeApprove(address(swapManager.ROUTERS(j)), 0);
                IERC20(_rewardToken).safeApprove(address(swapManager.ROUTERS(j)), _amount);
            }
        }
        collateralToken.safeApprove(DEPOSIT_ZAP, _amount);

        IERC20(crvLp).safeApprove(DEPOSIT_ZAP, _amount);
    }

    function _setupOracles() internal virtual override {
        super._setupOracles();

        uint256 _rewardsCount = ILiquidityGaugeV2(crvGauge).reward_count();

        for (uint256 i = 0; i < _rewardsCount; i++) {
            address _rewardToken = ILiquidityGaugeV2(crvGauge).reward_tokens(i);
            swapManager.createOrUpdateOracle(_rewardToken, WETH, oraclePeriod, oracleRouterIdx);
        }
    }

    function _claimRewardsAndConvertTo(address _toToken) internal virtual override {
        super._claimRewardsAndConvertTo(_toToken);

        uint256 _rewardsCount = ILiquidityGaugeV2(crvGauge).reward_count();

        if (_rewardsCount != 0) {
            ILiquidityGaugeV2(crvGauge).claim_rewards(address(this));

            for (uint256 i = 0; i < _rewardsCount; i++) {
                address _rewardToken = ILiquidityGaugeV2(crvGauge).reward_tokens(i);
                uint256 _amt = IERC20(_rewardToken).balanceOf(address(this));
                if (_amt != 0) {
                    address[] memory _path = new address[](3);
                    _path[0] = _rewardToken;
                    _path[1] = WETH;
                    _path[2] = _toToken;
                    uint256 _minAmtOut =
                        (swapSlippage != 10000)
                            ? _calcAmtOutAfterSlippage(_getOracleRate(_path, _amt), swapSlippage)
                            : 1;
                    _safeSwap(_rewardToken, _toToken, _amt, _minAmtOut);
                }
            }
        }
    }

    function _depositToCurve(uint256 _amt) internal virtual override returns (bool) {
        if (_amt != 0) {
            uint256[4] memory _depositAmounts;
            _depositAmounts[collIdx] = _amt;
            uint256 expectedOut =
                _calcAmtOutAfterSlippage(
                    IDepositZap4x(DEPOSIT_ZAP).calc_token_amount(crvLp, _depositAmounts, true),
                    crvSlippage
                );
            uint256 _minLpAmount =
                ((_amt * _getSafeUsdRate()) / crvPool.get_virtual_price()) * 10**(18 - coinDecimals[collIdx]);

            if (expectedOut > _minLpAmount) _minLpAmount = expectedOut;

            // solhint-disable-next-line no-empty-blocks
            try IDepositZap4x(DEPOSIT_ZAP).add_liquidity(crvLp, _depositAmounts, _minLpAmount) {} catch Error(
                string memory _reason
            ) {
                emit DepositFailed(_reason);
                return false;
            }
        }
        return true;
    }

    function _withdrawAsFromCrvPool(
        uint256 _lpAmount,
        uint256 _minAmt,
        uint256 _i
    ) internal virtual override {
        IDepositZap4x(DEPOSIT_ZAP).remove_liquidity_one_coin(crvLp, _lpAmount, SafeCast.toInt128(int256(_i)), _minAmt);
    }

    function getLpValueAs(uint256 _lpAmount, uint256 _i) public view virtual override returns (uint256) {
        return
            (_lpAmount != 0)
                ? IDepositZap4x(DEPOSIT_ZAP).calc_withdraw_one_coin(crvLp, _lpAmount, SafeCast.toInt128(int256(_i)))
                : 0;
    }
}
