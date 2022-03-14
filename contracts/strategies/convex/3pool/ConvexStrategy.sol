// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "../../../interfaces/convex/IConvex.sol";
import "../../../interfaces/convex/IConvexToken.sol";
import "../../curve/CrvPoolStrategyBase.sol";
import "../ConvexStrategyBase.sol";

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
        oracleRouterIdx = 0;
    }

    function updateClaimRewards(bool _isClaimRewards) external onlyGovernor {
        isClaimRewards = _isClaimRewards;
    }

    /// @dev convex pool can add new rewards. This method refresh list.
    function setRewardTokens(
        address[] memory /*_rewardTokens*/
    ) external override onlyKeeper {
        // Claims all rewards, if any, before updating the reward list
        _claimRewardsAndConvertTo(address(collateralToken));
        rewardTokens = _getRewardTokens();
        _approveToken(0);
        _approveToken(MAX_UINT_VALUE);
        _setupOracles();
    }

    function _approveToken(uint256 _amount) internal virtual override {
        IERC20(crvLp).safeApprove(BOOSTER, _amount);
        super._approveToken(_amount);
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

    function _claimRewards() internal override {
        require(Rewards(cvxCrvRewards).getReward(address(this), true), "reward-claim-failed");
    }

    function totalStaked() public view override returns (uint256 total) {
        total = Rewards(cvxCrvRewards).balanceOf(address(this));
    }

    function totalLp() public view override returns (uint256 total) {
        total = IERC20(crvLp).balanceOf(address(this)) + Rewards(cvxCrvRewards).balanceOf(address(this));
    }

    /// @dev Claimable rewards estimated into pool's collateral value
    function estimateClaimableRewardsInCollateral() public view virtual override returns (uint256 rewardAsCollateral) {
        ClaimableRewardInfo[] memory _claimableRewardsInfo = _claimableRewards();
        for (uint256 i = 0; i < _claimableRewardsInfo.length; i++) {
            if (_claimableRewardsInfo[i].amount != 0) {
                (, uint256 _reward, ) =
                    swapManager.bestOutputFixedInput(
                        _claimableRewardsInfo[i].token,
                        address(collateralToken),
                        _claimableRewardsInfo[i].amount
                    );
                rewardAsCollateral += _reward;
            }
        }
    }
}
