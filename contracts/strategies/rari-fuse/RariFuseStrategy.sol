// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "../compound/CompoundStrategy.sol";
import "../../interfaces/rari-fuse/IComptroller.sol";
import "../../interfaces/rari-fuse/IFusePoolDirectory.sol";

/// @title This strategy will deposit collateral token in a Rari Fuse Pool and earn interest.
contract RariFuseStrategy is CompoundStrategy {
    using SafeERC20 for IERC20;
    uint256 public fusePoolId;
    address public rewardDistributor;

    address private constant FUSE_POOL_DIRECTORY = 0x835482FE0532f169024d5E9410199369aAD5C77E;
    event FusePoolChanged(uint256 indexed newFusePoolId, address indexed oldCToken, address indexed newCToken);

    constructor(
        address _pool,
        address _swapManager,
        uint256 _fusePoolId,
        string memory _name
    )
        CompoundStrategy(
            _pool,
            _swapManager,
            address(0), // Comptroller
            address(0), // rewardToken
            _cTokenByUnderlying(_fusePoolId, address(IVesperPool(_pool).token())),
            _name
        )
    {
        fusePoolId = _fusePoolId;

        // Find and set the rewardToken from the fuse pool data
        _setRewardToken();
    }

    // solhint-enable no-empty-blocks

    /**
     * @notice Calculate total value using underlying token
     * @dev Report total value in collateral token
     */
    function totalValue() public view override returns (uint256 _totalValue) {
        _totalValue = _convertToCollateral(cToken.balanceOf(address(this)));
    }

    /**
     * @notice Changes the underlying Fuse Pool to a new one
     * @dev Redeems cTokens from current fuse pool and mints cTokens of new Fuse Pool
     * @param _newPoolId Fuse Pool ID
     */
    function migrateFusePool(uint256 _newPoolId) external virtual onlyGovernor {
        address _newCToken = _cTokenByUnderlying(_newPoolId, address(collateralToken));
        require(address(cToken) != _newCToken, "same-fuse-pool");
        require(cToken.redeem(cToken.balanceOf(address(this))) == 0, "withdraw-from-fuse-pool-failed");
        collateralToken.safeApprove(address(cToken), 0);
        // We usually do infinite approval via approveToken() any way
        collateralToken.safeApprove(_newCToken, MAX_UINT_VALUE);
        require(CToken(_newCToken).mint(collateralToken.balanceOf(address(this))) == 0, "deposit-to-fuse-pool-failed");
        emit FusePoolChanged(_newPoolId, address(cToken), _newCToken);
        cToken = CToken(_newCToken);
        receiptToken = _newCToken;
        fusePoolId = _newPoolId;
    }

    /**
     * @notice Gets the cToken to mint for a Fuse Pool
     * @param _poolId Fuse Pool ID
     * @param _collateralToken address of the collateralToken
     */
    function _cTokenByUnderlying(uint256 _poolId, address _collateralToken) internal view returns (address) {
        (, , address _comptroller, , ) = IFusePoolDirectory(FUSE_POOL_DIRECTORY).pools(_poolId);
        require(_comptroller != address(0), "rari-fuse-invalid-comptroller");
        if (_collateralToken == WETH) {
            // cETH is mapped with 0x0
            _collateralToken = address(0x0);
        }
        address _cToken = IComptroller(_comptroller).cTokensByUnderlying(_collateralToken);
        require(_cToken != address(0), "rari-fuse-invalid-ctoken");
        return _cToken;
    }

    // Automatically finds rewardToken set for the current Fuse Pool
    function _setRewardToken() internal virtual {
        (, , address _comptroller, , ) = IFusePoolDirectory(FUSE_POOL_DIRECTORY).pools(fusePoolId);

        uint256 _success;
        address _rewardDistributor;
        bytes4 _selector = IComptroller(_comptroller).rewardsDistributors.selector;

        // Low level static call to prevent revert in case the Comptroller doesn't have
        // rewardsDistributors function exposed
        // which may happen to older Fuse Pools

        assembly {
            let x := mload(0x40) // Find empty storage location using "free memory pointer"
            mstore(x, _selector) // Place signature at beginning of empty storage
            mstore(add(x, 0x04), 0) // Place first argument directly next to signature

            _success := staticcall(
                30000, // 30k gas
                _comptroller, // To addr
                x, // Inputs are stored at location x
                0x24, // Inputs are 36 bytes long
                x, // Store output over input (saves space)
                0x20
            ) // Outputs are 32 bytes long

            _rewardDistributor := mload(x) // Load the result
        }

        if (_rewardDistributor != address(0)) {
            rewardDistributor = _rewardDistributor;
            rewardToken = IRariRewardDistributor(_rewardDistributor).rewardToken();
        }
    }

    /// @notice Claim rewards from Fuse Pool' rewardDistributor
    function _claimRewards() internal virtual override {
        IRariRewardDistributor(rewardDistributor).claimRewards(address(this));
    }

    /// @notice Get rewards accrued in Fuse Pool' rewardDistributor
    function _getRewardAccrued() internal view virtual override returns (uint256 _rewardAccrued) {
        _rewardAccrued = IRariRewardDistributor(rewardDistributor).compAccrued(address(this));
    }

    // solhint-disable-next-line
    function _beforeMigration(address _newStrategy) internal override {}
}
