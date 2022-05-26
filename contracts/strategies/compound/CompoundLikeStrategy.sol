// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../compound/CompoundStrategy.sol";
import "../../interfaces/compound/IComptrollerMultiReward.sol";
import "../../interfaces/token/IToken.sol";

/// @title This strategy will deposit collateral token in a Compound Fork on avalanche and Earn Interest
contract CompoundLikeStrategy is CompoundStrategy {
    using SafeERC20 for IERC20;

    address internal constant WAVAX = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7;
    address public rewardDistributor;

    event RewardDistributorUpdated(address indexed _oldRewardDistributor, address indexed _newRewardDistributor);

    constructor(
        address _pool,
        address _swapManager,
        address _comptroller,
        address _rewardDistributor,
        address _rewardToken,
        address _receiptToken,
        string memory _name
    ) CompoundStrategy(_pool, _swapManager, _comptroller, _rewardToken, _receiptToken, _name) {
        WETH = WAVAX;
        require(_rewardDistributor != address(0), "invalid-reward-distributor-addr");
        rewardDistributor = _rewardDistributor;
    }

    // Updates rewardDistributor of the Compound fork, in case it changes over time
    function updateRewardDistributor(address _newRewardDistributor) external onlyKeeper {
        require(_newRewardDistributor != address(0), "invalid-reward-distributor-addr");
        emit RewardDistributorUpdated(rewardDistributor, _newRewardDistributor);
        rewardDistributor = _newRewardDistributor;
    }

    //solhint-disable-next-line no-empty-blocks
    receive() external payable {}

    /// @notice Approve all required tokens
    function _approveToken(uint256 _amount) internal virtual override {
        super._approveToken(_amount);

        // Approve router to swap extra wAVAX rewards
        // Expect for the case when collateral is wAVAX itself
        if (address(collateralToken) != WAVAX) {
            for (uint256 i = 0; i < swapManager.N_DEX(); i++) {
                IERC20(WAVAX).safeApprove(address(swapManager.ROUTERS(i)), _amount);
            }
        }
    }

    //solhint-disable-next-line no-empty-blocks
    function _claimRewards() internal override {}

    /// @notice Claim Protocol rewards + AVAX and convert them into collateral token.
    function _claimRewardsAndConvertTo(address _toToken) internal virtual override {
        ComptrollerMultiReward(address(COMPTROLLER)).claimReward(0, address(this)); // Claim protocol rewards
        ComptrollerMultiReward(address(COMPTROLLER)).claimReward(1, address(this)); // Claim native AVAX (optional)
        uint256 _rewardAmount = IERC20(rewardToken).balanceOf(address(this));
        if (_rewardAmount != 0) {
            _safeSwap(rewardToken, _toToken, _rewardAmount, 1);
        }
        uint256 _avaxRewardAmount = address(this).balance;
        if (_avaxRewardAmount != 0) {
            TokenLike(WAVAX).deposit{value: _avaxRewardAmount}();
            if (_toToken != WAVAX) {
                _safeSwap(WAVAX, _toToken, _avaxRewardAmount, 1);
            }
        }
    }

    /// @notice Get main Rewards accrued
    function _getRewardAccrued() internal view virtual override returns (uint256 _rewardAccrued) {
        _rewardAccrued = IRewardDistributor(rewardDistributor).rewardAccrued(0, address(this));
    }
}
