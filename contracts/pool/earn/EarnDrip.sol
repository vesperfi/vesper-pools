// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "../PoolRewards.sol";
import "../../interfaces/vesper/IVesperPool.sol";

contract VesperEarnDrip is PoolRewards {
    using SafeERC20 for IERC20;

    event DripRewardPaid(address indexed user, address indexed rewardToken, uint256 reward);
    event GrowTokenUpdated(address indexed oldGrowToken, address indexed newGrowToken);

    address public growToken;

    /**
     * @dev Notify that reward is added.
     * Also updates reward rate and reward earning period.
     */
    function notifyRewardAmount(
        address _rewardToken,
        uint256 _rewardAmount,
        uint256 _rewardDuration
    ) external override {
        (bool isStrategy, , , , , , , ) = IVesperPool(pool).strategy(msg.sender);
        require(
            msg.sender == IVesperPool(pool).governor() || (isRewardToken[_rewardToken] && isStrategy),
            "not-authorized"
        );
        super._notifyRewardAmount(_rewardToken, _rewardAmount, _rewardDuration, IVesperPool(pool).totalSupply());
    }

    /**
     * @notice Defines which rewardToken is a growToken
     * @dev growToken is used to check whether to call withdraw
     * from Grow Pool or not
     */
    function updateGrowToken(address _newGrowToken) external onlyAuthorized {
        require(_newGrowToken != address(0), "grow-token-address-zero");
        require(isRewardToken[_newGrowToken], "grow-token-not-reward-token");
        emit GrowTokenUpdated(growToken, _newGrowToken);
        growToken = _newGrowToken;
    }

    /**
     * @notice Transfer earned rewards in DripToken.
     * @dev Withdraws from the Grow Pool and transfers the amount to _account
     */
    function _transferRewards(
        address _rewardToken,
        address _account,
        uint256 _reward
    ) internal override {
        if (_rewardToken == growToken) {
            // Automatically unwraps the Grow Pool token into the dripToken
            IERC20 _dripToken = IVesperPool(_rewardToken).token();
            uint256 _dripBalanceBefore = _dripToken.balanceOf(address(this));
            IVesperPool(_rewardToken).withdraw(_reward);
            uint256 _dripTokenAmount = _dripToken.balanceOf(address(this)) - _dripBalanceBefore;
            _dripToken.safeTransfer(_account, _dripTokenAmount);
            emit DripRewardPaid(_account, address(_dripToken), _dripTokenAmount);
        } else {
            super._transferRewards(_rewardToken, _account, _reward);
        }
    }
}
