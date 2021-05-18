// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../interfaces/vesper/IVesperPool.sol";
import "../Strategy.sol";
import "./Crv3PoolMgr.sol";

/// @title This strategy will deposit collateral token in Compound and earn interest.
abstract contract Crv3PoolStrategy is Crv3PoolMgr, Strategy {
    using SafeERC20 for IERC20;

    mapping(address => bool) private reservedToken;
    uint256 public immutable collIdx;
    uint256 public prevLpRate;

    constructor(
        address _pool,
        address _swapManager,
        uint256 _collateralIdx
    ) Strategy(_pool, _swapManager, THREECRV) Crv3PoolMgr() {
        require(_collateralIdx < COINS.length, "Invalid collateral for 3Pool");
        require(COIN_ADDRS[_collateralIdx] == IVesperPool(_pool).token(), "Collateral does not match");
        reservedToken[THREECRV] = true;
        reservedToken[COIN_ADDRS[_collateralIdx]] = true;
        reservedToken[CRV] = true;
        collIdx = _collateralIdx;
    }

    /// @dev Check whether given token is reserved or not. Reserved tokens are not allowed to sweep.
    function isReservedToken(address _token) public view override returns (bool) {
        return reservedToken[_token];
    }

    function _approveToken(uint256 _amount) internal override {
        collateralToken.approve(pool, _amount);
        collateralToken.approve(crvPool, _amount);
        for (uint256 i = 0; i < swapManager.N_DEX(); i++) {
            IERC20(CRV).approve(address(swapManager.ROUTERS(i)), _amount);
        }
        IERC20(crvLp).approve(crvGauge, _amount);
    }

    function _reinvest() internal override {
        uint256 amt = collateralToken.balanceOf(address(this));
        if (amt != 0) {
            uint256[3] memory depositAmounts;
            depositAmounts[collIdx] = amt;
            THREEPOOL.add_liquidity(depositAmounts, 1);
            _stakeAllLpToGauge();
        }
    }

    function _withdraw(uint256 _amount) internal override {
        _unstakeAndWithdrawAsCollateral(_amount);
        collateralToken.safeTransfer(pool, IERC20(collateralToken).balanceOf(address(this)));
    }

    function _unstakeAndWithdrawAsCollateral(uint256 _amount) internal returns (uint256) {
        if (_amount == 0) return 0;
        (uint256 lpToWithdraw, uint256 unstakeAmt) = calcWithdrawLpAs(_amount, collIdx);
        _unstakeLpFromGauge(unstakeAmt);
        _withdrawAsFromCrvPool(lpToWithdraw, convertFrom18(minimumLpPrice()), collIdx);
        return collateralToken.balanceOf(address(this));
    }

    /**
     * @notice Calculate total value of asset under management
     * @dev Report total value in collateral token
     */
    function totalValue() external view override returns (uint256 _value) {
        _value = collateralToken.balanceOf(address(this)) + getLpValueAs(totalLp(), collIdx);
    }

    /**
     * @notice some strategy may want to prpeare before doing migration. 
        Example In Maker old strategy want to give vault ownership to new strategy
     * @param _newStrategy .
     */
    function _beforeMigration(address _newStrategy) internal override {
        _unstakeAllLpFromGauge();
    }

    // Some streateies may not have rewards hence they do not need this function.
    function _claimRewardsAndConvertTo(address _toToken) internal override {
        _claimCrv();
        uint256 amt = IERC20(CRV).balanceOf(address(this));
        if (amt != 0) {
            _safeSwap(CRV, _toToken, amt, 1);
        }
    }

    /**
     * @notice Withdraw collateral to payback excess debt in pool.
     * @param _excessDebt Excess debt of strategy in collateral token
     * @return _payback amount in collateral token. Usually it is equal to excess debt.
     */
    function _liquidate(uint256 _excessDebt) internal override returns (uint256 _payback) {
        _payback = _unstakeAndWithdrawAsCollateral(_excessDebt);
    }

    function _realizeGross(uint256 _totalDebt) internal returns (uint256 _profit, uint256 _loss) {
        _claimRewardsAndConvertTo(address(collateralToken));
        uint256 _collateralBalance = getLpValueAs(totalLp(), collIdx);
        if (_collateralBalance > _totalDebt) {
            _unstakeAndWithdrawAsCollateral(_collateralBalance - _totalDebt);
        } else {
            _loss = _totalDebt - _collateralBalance;
        }
        _profit = collateralToken.balanceOf(address(this));
    }

    function _realizeProfit(uint256 _totalDebt) internal override returns (uint256 _profit) {}

    function _realizeLoss(uint256 _totalDebt) internal override returns (uint256 _loss) {}

    function _generateReport()
        internal
        override
        returns (
            uint256 _profit,
            uint256 _loss,
            uint256 _payback
        )
    {
        uint256 _excessDebt = IVesperPool(pool).excessDebt(address(this));
        uint256 _totalDebt = IVesperPool(pool).totalDebtOf(address(this));
        (_profit, _loss) = _realizeGross(_totalDebt);
        _payback = _liquidate(_excessDebt);
    }
}
