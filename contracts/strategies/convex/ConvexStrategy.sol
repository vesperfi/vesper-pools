// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "../../interfaces/convex/IConvex.sol";
import "../../interfaces/convex/IConvexToken.sol";
import "../curve/Crv3PoolStrategyBase.sol";

/// @title This strategy will deposit collateral token in Curve 3Pool and stake lp token to convex.
abstract contract ConvexStrategy is Crv3PoolStrategyBase {
    using SafeERC20 for IERC20;

    address public constant CVX = 0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B;
    address public constant BOOSTER = 0xF403C135812408BFbE8713b5A23a04b3D48AAE31;
    address public immutable cvxCrvRewards;
    uint256 public immutable convexPoolId;
    bool public isClaimRewards;
    bool public isClaimExtras;
    uint256 internal constant SUSHISWAP_ROUTER_INDEX = 1;

    constructor(
        address _pool,
        address _threePool,
        address _threeCrv,
        address _gauge,
        address _swapManager,
        uint256 _collateralIdx,
        uint256 _convexPoolId
    ) Crv3PoolStrategyBase(_pool, _threePool, _threeCrv, _gauge, _swapManager, _collateralIdx) {
        (address _lp, , , address _reward, , ) = IConvex(BOOSTER).poolInfo(_convexPoolId);
        require(_lp == address(_threeCrv), "incorrect-lp-token");
        cvxCrvRewards = _reward;
        convexPoolId = _convexPoolId;
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
        Rewards(cvxCrvRewards).getReward(address(this), isClaimExtras);
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
        uint256 _claimableRewards = claimableRewards();

        // CVX Rewards are minted based on CRV rewards claimed upon withdraw
        // This will calculate the CVX amount based on CRV rewards accrued
        // without having to claim CRV rewards first
        // ref 1: https://github.com/convex-eth/platform/blob/main/contracts/contracts/Cvx.sol#L61-L76
        // ref 2: https://github.com/convex-eth/platform/blob/main/contracts/contracts/Booster.sol#L458-L466

        uint256 _reductionPerCliff = IConvexToken(CVX).reductionPerCliff();
        uint256 _totalSupply = IConvexToken(CVX).totalSupply();
        uint256 _maxSupply = IConvexToken(CVX).maxSupply();
        uint256 _cliff = _totalSupply / _reductionPerCliff;
        uint256 _totalCliffs = 1000;

        if (_cliff < _totalCliffs) {
            //for reduction% take inverse of current cliff
            uint256 _reduction = _totalCliffs - _cliff;
            //reduce
            total = (_claimableRewards * _reduction) / _totalCliffs;

            //supply cap check
            uint256 _amtTillMax = _maxSupply - _totalSupply;
            if (total > _amtTillMax) {
                total = _amtTillMax;
            }
        }
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
