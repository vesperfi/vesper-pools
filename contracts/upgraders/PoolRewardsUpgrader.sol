// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./UpgraderBase.sol";

contract PoolRewardsUpgrader is UpgraderBase {
    constructor(address _multicall)
        UpgraderBase(_multicall) // solhint-disable-next-line no-empty-blocks
    {}

    function _calls() internal pure override returns (bytes[] memory calls) {
        calls = new bytes[](6);
        calls[0] = abi.encodeWithSignature("pool()");
        calls[1] = abi.encodeWithSignature("rewardToken()");
        calls[2] = abi.encodeWithSignature("lastUpdateTime()");
        calls[3] = abi.encodeWithSignature("rewardPerTokenStored()");
        calls[4] = abi.encodeWithSignature("lastTimeRewardApplicable()");
        calls[5] = abi.encodeWithSignature("rewardPerToken()");
    }

    function _checkResults(bytes[] memory _beforeResults, bytes[] memory _afterResults) internal pure override {
        address beforePool = abi.decode(_beforeResults[0], (address));
        address beforeRewardToken = abi.decode(_beforeResults[1], (address));
        uint256 beforeLastUpdateTime = abi.decode(_beforeResults[2], (uint256));
        uint256 beforeRewardPerTokenStored = abi.decode(_beforeResults[3], (uint256));
        uint256 beforeLastTimeRewardApplicable = abi.decode(_beforeResults[4], (uint256));
        uint256 beforeRewardPerToken = abi.decode(_beforeResults[5], (uint256));

        address afterPool = abi.decode(_afterResults[0], (address));
        address afterRewardToken = abi.decode(_afterResults[1], (address));
        uint256 afterLastUpdateTime = abi.decode(_afterResults[2], (uint256));
        uint256 afterRewardPerTokenStored = abi.decode(_afterResults[3], (uint256));
        uint256 afterLastTimeRewardApplicable = abi.decode(_afterResults[4], (uint256));
        uint256 afterRewardPerToken = abi.decode(_afterResults[5], (uint256));

        require(
            beforePool == afterPool &&
                beforeRewardToken == afterRewardToken &&
                beforeLastUpdateTime == afterLastUpdateTime &&
                beforeRewardPerTokenStored == afterRewardPerTokenStored,
            "fields-test-failed"
        );
        require(
            beforeLastTimeRewardApplicable == afterLastTimeRewardApplicable &&
                beforeRewardPerToken == afterRewardPerToken,
            "methods-test-failed"
        );
    }
}
