// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

interface IPoolRewards {
    function claimReward(address) external;

    function notifyRewardAmount(uint256 rewardAmount, uint256 endTime) external;

    function updateRewardEnd() external;

    function updateReward(address) external;

    function withdrawRemaining(address _toAddress) external;

    function rewardForDuration() external view returns (uint256);

    function claimable(address) external view returns (uint256);

    function pool() external view returns (address);

    function lastTimeRewardApplicable() external view returns (uint256);

    function rewardPerToken() external view returns (uint256);
}
