// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../../interfaces/vesper/IVesperPool.sol";
import "../../../interfaces/aave/IAave.sol";
import "../../Strategy.sol";
import "../CrvPoolStrategyBase.sol";

/// @title This strategy will deposit collateral token in Curve Aave 3Pool and earn interest.
abstract contract CrvA3PoolStrategyBase is CrvPoolStrategyBase {
    using SafeERC20 for IERC20;
    uint256 internal constant N = 3;

    constructor(
        address _pool,
        address _swapManager,
        address _crvPool,
        address _lp,
        address _gauge,
        uint256 _collateralIdx,
        string memory _name
    ) CrvPoolStrategyBase(_pool, _crvPool, _lp, _gauge, _swapManager, _collateralIdx, N, _name) {
        require(IStableSwap3xUnderlying(_crvPool).lp_token() == _lp, "receipt-token-mismatch");
    }

    function _init(address _crvPool, uint256 _n) internal virtual override {
        address[] memory _coins = new address[](_n);
        uint256[] memory _coinDecimals = new uint256[](_n);
        for (uint256 i = 0; i < _n; i++) {
            _coins[i] = IStableSwap3xUnderlying(_crvPool).underlying_coins(i);
            _coinDecimals[i] = IERC20Metadata(_coins[i]).decimals();
        }
        coins = _coins;
        coinDecimals = _coinDecimals;
    }

    function _claimRewards() internal virtual override {
        ITokenMinter(CRV_MINTER).mint(crvGauge);
        ILiquidityGaugeV2(crvGauge).claim_rewards(address(this));
    }

    function _depositToCurve(uint256 _amt) internal override returns (bool) {
        if (_amt != 0) {
            uint256[3] memory _depositAmounts;
            _depositAmounts[collIdx] = _amt;
            uint256 _expectedOut =
                _calcAmtOutAfterSlippage(
                    IStableSwap3xUnderlying(address(crvPool)).calc_token_amount(_depositAmounts, true),
                    crvSlippage
                );
            uint256 _minLpAmount =
                ((_amt * _getSafeUsdRate()) / crvPool.get_virtual_price()) * 10**(18 - coinDecimals[collIdx]);
            if (_expectedOut > _minLpAmount) _minLpAmount = _expectedOut;
            // solhint-disable no-empty-blocks
            try
                IStableSwap3xUnderlying(address(crvPool)).add_liquidity(_depositAmounts, _minLpAmount, true)
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
