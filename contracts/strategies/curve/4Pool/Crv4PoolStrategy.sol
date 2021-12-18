// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../../interfaces/vesper/IVesperPool.sol";
import "../../../interfaces/curve/IDeposit.sol";
import "../../Strategy.sol";
import "../CrvPoolStrategyBase.sol";

/// @title This strategy will deposit collateral token in a Curve 4Pool and earn interest.
abstract contract Crv4PoolStrategy is CrvPoolStrategyBase {
    using SafeERC20 for IERC20;

    // No. of pooled tokens in the Pool
    uint256 private constant N = 4;

    // Legacy Curve Deposit Helper contract for pure 4Pools
    // e.g: for sUSD 4Pool, deposit contract is: 0xfcba3e75865d2d561be8d220616520c171f12851
    // Offers same functionalities as DepositZap for Metapools with a different interface
    address public crvDeposit;

    constructor(
        address _pool,
        address _swapManager,
        address _crvDeposit,
        address _crvPool,
        address _crvLp,
        address _gauge,
        uint256 _collateralIdx,
        string memory _name
    ) CrvPoolStrategyBase(_pool, _crvPool, _crvLp, _gauge, _swapManager, _collateralIdx, N, _name) {
        require(IDeposit4x(_crvDeposit).token() == _crvLp, "invalid-deposit-contract");

        crvDeposit = _crvDeposit;

        require(ILiquidityGaugeV2(_gauge).lp_token() == _crvLp, "invalid-gauge");

        require(
            IStableSwapV2(_crvPool).coins(int128((int256(_collateralIdx)))) == address(IVesperPool(_pool).token()),
            "collateral-mismatch"
        );
    }

    function _init(address _crvPool, uint256 _n) internal virtual override {
        for (uint256 i = 0; i < _n; i++) {
            coins.push(IStableSwapV2(_crvPool).coins(int128((int256(i)))));
            coinDecimals.push(IERC20Metadata(coins[i]).decimals());
        }
    }

    function _setupOracles() internal virtual override {
        super._setupOracles();
        address _rewardToken = ILiquidityGaugeV1(crvGauge).rewarded_token();
        if (_rewardToken != address(0))
            swapManager.createOrUpdateOracle(_rewardToken, WETH, oraclePeriod, oracleRouterIdx);
    }

    function _approveToken(uint256 _amount) internal virtual override {
        super._approveToken(_amount);
        address _rewardToken = ILiquidityGaugeV1(crvGauge).rewarded_token();
        if (_rewardToken != address(0)) {
            for (uint256 i = 0; i < swapManager.N_DEX(); i++) {
                IERC20(_rewardToken).safeApprove(address(swapManager.ROUTERS(i)), _amount);
            }
        }
        collateralToken.safeApprove(crvDeposit, _amount);

        IERC20(crvLp).safeApprove(crvDeposit, _amount);
    }

    function _claimRewardsAndConvertTo(address _toToken) internal virtual override {
        super._claimRewardsAndConvertTo(_toToken);

        address _rewardToken = ILiquidityGaugeV1(crvGauge).rewarded_token();

        if (_rewardToken != address(0)) {
            ILiquidityGaugeV1(crvGauge).claim_rewards(address(this));
            uint256 _amt = IERC20(_rewardToken).balanceOf(address(this));
            if (_amt != 0) {
                address[] memory _path = new address[](3);
                _path[0] = _rewardToken;
                _path[1] = WETH;
                _path[2] = _toToken;
                uint256 _minAmtOut =
                    (swapSlippage != 10000) ? _calcAmtOutAfterSlippage(_getOracleRate(_path, _amt), swapSlippage) : 1;
                _safeSwap(_rewardToken, _toToken, _amt, _minAmtOut);
            }
        }
    }

    function _depositToCurve(uint256 amt) internal virtual override returns (bool) {
        if (amt != 0) {
            uint256[4] memory _depositAmounts;
            _depositAmounts[collIdx] = amt;
            uint256 _expectedOut =
                _calcAmtOutAfterSlippage(
                    IStableSwap4xUnderlying(address(crvPool)).calc_token_amount(_depositAmounts, true),
                    crvSlippage
                );

            uint256 _minLpAmount =
                ((amt * _getSafeUsdRate()) / crvPool.get_virtual_price()) * 10**(18 - coinDecimals[collIdx]);
            if (_expectedOut > _minLpAmount) _minLpAmount = _expectedOut;
            // solhint-disable-next-line no-empty-blocks
            try IDeposit4x(crvDeposit).add_liquidity(_depositAmounts, _minLpAmount) {} catch Error(
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
        IDeposit4x(crvDeposit).remove_liquidity_one_coin(_lpAmount, SafeCast.toInt128(int256(_i)), _minAmt);
    }

    function getLpValueAs(uint256 _lpAmount, uint256 _i) public view virtual override returns (uint256) {
        return
            (_lpAmount != 0)
                ? IDeposit4x(crvDeposit).calc_withdraw_one_coin(_lpAmount, SafeCast.toInt128(int256(_i)))
                : 0;
    }
}
