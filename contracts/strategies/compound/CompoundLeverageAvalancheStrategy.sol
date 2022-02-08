pragma solidity 0.8.3;

import "./CompoundLeverageStrategy.sol";
import "../../interfaces/compound/IComptrollerMultiReward.sol";

contract CompoundLeverageAvalancheStrategy is CompoundLeverageStrategy {
    using SafeERC20 for IERC20;

    address internal constant WAVAX = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7;

    constructor(
        address _pool,
        address _swapManager,
        address _comptroller,
        address _rewardDistributor,
        address _rewardToken,
        address _aaveAddressProvider,
        address _receiptToken,
        string memory _name
    )
        CompoundLeverageStrategy(
            _pool,
            _swapManager,
            _comptroller,
            _rewardDistributor,
            _rewardToken,
            _aaveAddressProvider,
            _receiptToken,
            _name
        )
    {
        WETH = WAVAX;
    }

    // Allow to receive avax from rewardDistributor only
    receive() external payable {
        require(msg.sender == rewardDistributor, "not-allowed-to-receive-avax");
    }

    /// @notice Approve all required tokens
    function _approveToken(uint256 _amount) internal virtual override {
        collateralToken.safeApprove(pool, _amount);
        collateralToken.safeApprove(address(cToken), _amount);
        for (uint256 i = 0; i < swapManager.N_DEX(); i++) {
            IERC20(rewardToken).safeApprove(address(swapManager.ROUTERS(i)), _amount);
            IERC20(WAVAX).safeApprove(address(swapManager.ROUTERS(i)), _amount);
        }
        FlashLoanHelper._approveToken(address(collateralToken), _amount);
    }

    /// @notice Get main Rewards accrued
    function _getRewardAccrued() internal view override returns (uint256 _rewardAccrued) {
        _rewardAccrued = IRewardDistributor(rewardDistributor).rewardAccrued(0, address(this));
    }

    /// @notice Claim Protocol rewards + AVAX
    function _claimRewards() internal override {
        ComptrollerMultiReward(address(COMPTROLLER)).claimReward(0, address(this)); // Claim protocol rewards
        ComptrollerMultiReward(address(COMPTROLLER)).claimReward(1, address(this)); // Claim native AVAX (optional)
    }

    function _safeSwap(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn
    ) internal override {
        // Removed UniV3 Oracle slippage check on Avalanche
        _safeSwap(_tokenIn, _tokenOut, _amountIn, 1);
    }

    /// @dev DyDx isn't currently on Avalanche
    //solhint-disable-next-line no-empty-blocks
    function updateDyDxStatus(bool _status) external override onlyGovernor {}
}
