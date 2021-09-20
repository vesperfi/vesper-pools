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
        uint256 _collateralIdx
    ) CrvPoolStrategyBase(_pool, _crvPool, _crvLp, _gauge, _swapManager, _collateralIdx, N) {
        require(IDeposit4x(_crvDeposit).token() == _crvLp, "invalid-deposit-contract");

        crvDeposit = _crvDeposit;

        require(ILiquidityGaugeV2(_gauge).lp_token() == _crvLp, "invalid-gauge");

        require(
            IStableSwapV2(_crvPool).coins(int128((int256(_collateralIdx)))) == address(IVesperPool(_pool).token()),
            "collateral-mismatch"
        );
    }

    function _init(address _crvPool, uint256 _n) internal virtual override {
        address[] memory _coins = new address[](_n);
        uint256[] memory _coinDecimals = new uint256[](_n);
        for (uint256 i = 0; i < _n; i++) {
            _coins[i] = IStableSwapV2(_crvPool).coins(int128((int256(i))));
            _coinDecimals[i] = IERC20Metadata(_coins[i]).decimals();
        }
        coins = _coins;
        coinDecimals = _coinDecimals;
    }

    function _approveToken(uint256 _amount) internal virtual override {
        super._approveToken(_amount);
        address _rewardToken = ILiquidityGaugeV1(crvGauge).rewarded_token();
        if (_rewardToken != address(0)) {
            for (uint256 i = 0; i < swapManager.N_DEX(); i++) {
                IERC20(_rewardToken).safeApprove(address(swapManager.ROUTERS(i)), 0);
                IERC20(_rewardToken).safeApprove(address(swapManager.ROUTERS(i)), _amount);
            }
        }
        collateralToken.safeApprove(crvDeposit, _amount);
        IERC20(crvLp).safeApprove(crvDeposit, 0);
        IERC20(crvLp).safeApprove(crvDeposit, _amount);
    }

    function _claimRewardsAndConvertTo(address _toToken) internal virtual override {
        super._claimRewardsAndConvertTo(_toToken);

        address _rewardToken = ILiquidityGaugeV1(crvGauge).rewarded_token();

        if (_rewardToken != address(0)) {
            ILiquidityGaugeV1(crvGauge).claim_rewards(address(this));
            uint256 amt = IERC20(_rewardToken).balanceOf(address(this));
            if (amt != 0) {
                address[] memory path = new address[](3);
                path[0] = _rewardToken;
                path[1] = WETH;
                path[2] = _toToken;
                uint256 minAmtOut =
                    (swapSlippage != 10000) ? _calcAmtOutAfterSlippage(_getOracleRate(path, amt), swapSlippage) : 1;
                _safeSwap(_rewardToken, _toToken, amt, minAmtOut);
            }
        }
    }

    function _depositToCurve(uint256 amt) internal virtual override returns (bool) {
        if (amt != 0) {
            uint256[4] memory depositAmounts;
            depositAmounts[collIdx] = amt;
            uint256 expectedOut =
                _calcAmtOutAfterSlippage(
                    IStableSwap4xUnderlying(address(crvPool)).calc_token_amount(depositAmounts, true),
                    crvSlippage
                );

            uint256 minLpAmount =
                ((amt * _getSafeUsdRate()) / crvPool.get_virtual_price()) * 10**(18 - coinDecimals[collIdx]);
            if (expectedOut > minLpAmount) minLpAmount = expectedOut;
            // solhint-disable-next-line no-empty-blocks
            try IDeposit4x(crvDeposit).add_liquidity(depositAmounts, minLpAmount) {} catch Error(string memory reason) {
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
    ) internal virtual override {
        IDeposit4x(crvDeposit).remove_liquidity_one_coin(_lpAmount, SafeCast.toInt128(int256(i)), _minAmt);
    }

    function getLpValueAs(uint256 _lpAmount, uint256 i) public view virtual override returns (uint256) {
        return
            (_lpAmount != 0)
                ? IDeposit4x(crvDeposit).calc_withdraw_one_coin(_lpAmount, SafeCast.toInt128(int256(i)))
                : 0;
    }
}
