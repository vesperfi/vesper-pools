// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "../../interfaces/convex/IConvex.sol";
import "../../interfaces/convex/IConvexToken.sol";
import "../curve/CrvPoolStrategyBase.sol";
import "./ConvexStrategyBase.sol";

/// @title This strategy will deposit collateral token in Curve 3Pool and stake lp token to convex.
abstract contract ConvexStrategy is CrvPoolStrategyBase, ConvexStrategyBase {
    using SafeERC20 for IERC20;

    constructor(
        address _pool,
        address _threePool,
        address _threeCrv,
        address _gauge,
        address _swapManager,
        uint256 _collateralIdx,
        uint256 _convexPoolId,
        // No. of pooled tokens in the pool
        uint256 _n,
        string memory _name
    )
        CrvPoolStrategyBase(_pool, _threePool, _threeCrv, _gauge, _swapManager, _collateralIdx, _n, _name)
        ConvexStrategyBase(_threeCrv, _convexPoolId)
    {
        reservedToken[CVX] = true;
        oracleRouterIdx = 0;
    }

    function updateClaimRewards(bool _isClaimRewards) external onlyGovernor {
        isClaimRewards = _isClaimRewards;
    }

    function updateClaimExtras(bool _isClaimExtras) external onlyGovernor {
        isClaimExtras = _isClaimExtras;
    }

    function _approveToken(uint256 _amount) internal virtual override {
        IERC20(crvLp).safeApprove(BOOSTER, _amount);
        for (uint256 i = 0; i < swapManager.N_DEX(); i++) {
            IERC20(CVX).safeApprove(address(swapManager.ROUTERS(i)), _amount);
        }
        super._approveToken(_amount);
    }

    function _setupOracles() internal virtual override {
        swapManager.createOrUpdateOracle(CVX, WETH, oraclePeriod, SUSHISWAP_ROUTER_INDEX);
        super._setupOracles();
    }

    function _stakeAllLp() internal override {
        uint256 balance = IERC20(crvLp).balanceOf(address(this));
        if (balance != 0) {
            require(IConvex(BOOSTER).deposit(convexPoolId, balance, true), "booster-deposit-failed");
        }
    }

    function _unstakeAllLp() internal override {
        Rewards(cvxCrvRewards).withdrawAllAndUnwrap(isClaimRewards);
    }

    function _unstakeLp(uint256 _amount) internal override {
        if (_amount != 0) {
            require(Rewards(cvxCrvRewards).withdrawAndUnwrap(_amount, false), "withdraw-and-unwrap-failed");
        }
    }

    function _claimRewardsAndConvertTo(address _toToken) internal virtual override {
        require(Rewards(cvxCrvRewards).getReward(address(this), isClaimExtras), "reward-claim-failed");
        uint256 amt = IERC20(CRV).balanceOf(address(this));
        if (amt != 0) {
            uint256 minAmtOut;
            if (swapSlippage < 10000) {
                (uint256 minWethOut, bool isValid) = _consultOracle(CRV, WETH, amt);
                (uint256 _minAmtOut, bool isValidTwo) = _consultOracle(WETH, _toToken, minWethOut);
                require(isValid, "stale-crv-oracle");
                require(isValidTwo, "stale-collateral-oracle");
                minAmtOut = _calcAmtOutAfterSlippage(_minAmtOut, swapSlippage);
            }
            _safeSwap(CRV, _toToken, amt, minAmtOut);
        }

        amt = IERC20(CVX).balanceOf(address(this));
        if (amt != 0) {
            uint256 minAmtOut;
            if (swapSlippage < 10000) {
                (uint256 minWethOut, bool isValid) = _consultOracle(CVX, WETH, amt);
                (uint256 _minAmtOut, bool isValidTwo) = _consultOracle(WETH, _toToken, minWethOut);
                require(isValid, "stale-cvx-oracle");
                require(isValidTwo, "stale-collateral-oracle");
                minAmtOut = _calcAmtOutAfterSlippage(_minAmtOut, swapSlippage);
            }
            _safeSwap(CVX, _toToken, amt, minAmtOut);
        }
    }

    function claimableRewards() public view override returns (uint256 total) {
        total = Rewards(cvxCrvRewards).earned(address(this));
    }

    function claimableRewardsCVX() public view returns (uint256 total) {
        total = _calculateCVXRewards(claimableRewards());
    }

    function totalStaked() public view override returns (uint256 total) {
        total = Rewards(cvxCrvRewards).balanceOf(address(this));
    }

    function totalLp() public view override returns (uint256 total) {
        total = IERC20(crvLp).balanceOf(address(this)) + Rewards(cvxCrvRewards).balanceOf(address(this));
    }

    function totalValue() public view virtual override returns (uint256 _value) {
        _value = super.totalValue();
        uint256 _claimableCVX = claimableRewardsCVX();
        if (_claimableCVX != 0) {
            (, uint256 _wethOutput, ) = swapManager.bestOutputFixedInput(CVX, WETH, _claimableCVX);
            (, uint256 _rewardAsCollateral, ) =
                swapManager.bestOutputFixedInput(WETH, address(collateralToken), _wethOutput);
            if (_rewardAsCollateral != 0) _value += _rewardAsCollateral;
        }
    }
}
