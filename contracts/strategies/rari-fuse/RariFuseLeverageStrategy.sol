// SPDX-License-Identifier: GNU LGPLv3

pragma solidity 0.8.9;

import "../Strategy.sol";
import "./RariCore.sol";
import "../compound/CompoundLeverageStrategy.sol";

/// @title This strategy will deposit collateral token in Compound and based on position
/// it will borrow same collateral token. It will use borrowed asset as supply and borrow again.
contract RariFuseLeverageStrategy is CompoundLeverageStrategy {
    using SafeERC20 for IERC20;
    using RariCore for IFusePoolDirectory;
    uint256 public immutable fusePoolId;
    IFusePoolDirectory public immutable fusePoolDirectory;

    constructor(
        address _pool,
        address _swapManager,
        address _aaveAddressesProvider,
        uint256 _fusePoolId,
        IFusePoolDirectory _fusePoolDirectory,
        string memory _name
    )
        CompoundLeverageStrategy(
            _pool,
            _swapManager,
            _fusePoolDirectory.getComptroller(_fusePoolId),
            address(0), // rewardsDistributor
            address(0), // rewardToken
            _aaveAddressesProvider,
            _fusePoolDirectory.getCTokenByUnderlying(_fusePoolId, address(IVesperPool(_pool).token())),
            _name
        )
    {
        fusePoolId = _fusePoolId;
        fusePoolDirectory = _fusePoolDirectory;
        // Find and set the rewardToken from the fuse pool data
        (rewardDistributor, rewardToken) = _fusePoolDirectory.getRewardToken(_fusePoolId);
    }

    /// @notice Claim rewards from Fuse Pool' rewardDistributor
    function _claimRewards() internal virtual override {
        IRariRewardDistributor(rewardDistributor).claimRewards(address(this));
    }

    /// @notice Get rewards accrued in Fuse Pool' rewardDistributor
    function _getRewardAccrued() internal view virtual override returns (uint256 _rewardAccrued) {
        _rewardAccrued = IRariRewardDistributor(rewardDistributor).compAccrued(address(this));
    }

    /**
     * @notice Get Collateral Factor
     */
    function _getCollateralFactor() internal view virtual override returns (uint256 _collateralFactor) {
        (, _collateralFactor) = IComptroller(fusePoolDirectory.getComptroller(fusePoolId)).markets(address(cToken));
        // Take 95% of collateralFactor to avoid any rounding issue.
        _collateralFactor = (_collateralFactor * 95) / 100;
    }
}
