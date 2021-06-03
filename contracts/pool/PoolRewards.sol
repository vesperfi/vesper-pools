// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/vesper/IPoolRewards.sol";
import "../interfaces/vesper/IVesperPool.sol";

contract PoolRewards is IPoolRewards, ReentrancyGuard {
    using SafeERC20 for IERC20;
    address public immutable override pool;
    IERC20 public immutable rewardToken;

    uint256 public periodFinish = 0;
    uint256 public rewardRate = 0;
    uint256 public constant REWARD_DURATION = 30 days;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    event RewardAdded(uint256 reward);

    constructor(address _pool, address _rewardToken) {
        rewardToken = IERC20(_rewardToken);
        pool = _pool;
    }

    event RewardPaid(address indexed user, uint256 reward);

    /**
     * @dev Notify that reward is added.
     * Also updates reward rate and reward earning period.
     */
    function notifyRewardAmount(uint256 rewardAmount) external override {
        _updateReward(address(0));
        require(msg.sender == IVesperPool(pool).governor(), "not-authorized");
        require(address(rewardToken) != address(0), "rewards-token-not-set");
        if (block.timestamp >= periodFinish) {
            rewardRate = rewardAmount / REWARD_DURATION;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            rewardRate = (rewardAmount + leftover) / REWARD_DURATION;
        }

        uint256 balance = rewardToken.balanceOf(address(this));
        require(rewardRate <= (balance / REWARD_DURATION), "rewards-too-high");

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + REWARD_DURATION;
        emit RewardAdded(rewardAmount);
    }

    /// @dev Claim reward earned so far.
    function claimReward(address account) external override nonReentrant {
        _updateReward(account);
        uint256 reward = rewards[account];
        if (reward != 0) {
            rewards[account] = 0;
            rewardToken.safeTransfer(account, reward);
            emit RewardPaid(account, reward);
        }
    }

    /**
     * @dev Updated reward for given account. Only Pool can call
     */
    function updateReward(address _account) external override {
        require(msg.sender == pool, "Only pool can update reward");
        _updateReward(_account);
    }

    function rewardForDuration() external view override returns (uint256) {
        return rewardRate * REWARD_DURATION;
    }

    /// @dev Returns claimable reward amount.
    function claimable(address account) public view override returns (uint256) {
        uint256 _balance = IERC20(pool).balanceOf(account);
        uint256 _rewardPerTokenAvailable = rewardPerToken() - userRewardPerTokenPaid[account];
        uint256 _rewardsEarnedSinceLastUpdate = (_balance * _rewardPerTokenAvailable) / 1e18;
        return rewards[account] + _rewardsEarnedSinceLastUpdate;
    }

    /// @dev Returns timestamp of last reward update
    function lastTimeRewardApplicable() public view override returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerToken() public view override returns (uint256) {
        if (IERC20(pool).totalSupply() == 0) {
            return rewardPerTokenStored;
        }

        uint256 _timeSinceLastUpdate = lastTimeRewardApplicable() - lastUpdateTime;
        uint256 _rewardsSinceLastUpdate = _timeSinceLastUpdate * rewardRate;
        uint256 _rewardsPerTokenSinceLastUpdate = (_rewardsSinceLastUpdate * 1e18) / IERC20(pool).totalSupply();
        return rewardPerTokenStored + _rewardsPerTokenSinceLastUpdate;
    }

    function _updateReward(address _account) private {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (_account != address(0)) {
            rewards[_account] = claimable(_account);
            userRewardPerTokenPaid[_account] = rewardPerTokenStored;
        }
    }
}
