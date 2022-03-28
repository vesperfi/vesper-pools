// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../../interfaces/vesper/IVesperPool.sol";
import "../../../interfaces/aave/IAave.sol";
import "../../Strategy.sol";
import "../CrvPoolStrategyBase.sol";

/// @title This strategy will deposit collateral token in Curve Aave 3Pool and earn interest.
contract CrvA3PoolStrategy is CrvPoolStrategyBase {
    using SafeERC20 for IERC20;
    uint256 private constant N = 3;
    address private constant CRV_POOL = 0xDeBF20617708857ebe4F679508E7b7863a8A8EeE;
    address private constant LP = 0xFd2a8fA60Abd58Efe3EeE34dd494cD491dC14900;
    address private constant GAUGE = 0xd662908ADA2Ea1916B3318327A97eB18aD588b5d;
    address private constant STKAAVE = 0x4da27a545c0c5B758a6BA100e3a049001de870f5;
    address private constant AAVE = 0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9;

    constructor(
        address _pool,
        address _swapManager,
        uint256 _collateralIdx,
        string memory _name
    ) CrvPoolStrategyBase(_pool, CRV_POOL, LP, GAUGE, _swapManager, _collateralIdx, N, _name) {
        require(IStableSwap3xUnderlying(CRV_POOL).lp_token() == LP, "receipt-token-mismatch");
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

    function _claimRewards() internal override {
        ITokenMinter(CRV_MINTER).mint(crvGauge);
        _claimAave();
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
