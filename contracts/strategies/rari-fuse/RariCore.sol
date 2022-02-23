// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "../../interfaces/aave/IAave.sol";
import "../../interfaces/rari-fuse/IComptroller.sol";
import "../compound/CompoundStrategy.sol";
import "../../interfaces/rari-fuse/IFusePoolDirectory.sol";

/// @title This library provide core operations for Rari
library RariCore {
    function getComptroller(uint256 _fusePoolId) internal view returns (address _comptroller) {
        //address  FUSE_POOL_DIRECTORY = 0x835482FE0532f169024d5E9410199369aAD5C77E;
        (, , _comptroller, , ) = IFusePoolDirectory(0x835482FE0532f169024d5E9410199369aAD5C77E).pools(_fusePoolId);
    }

    /**
     * @notice Gets the cToken to mint for a Fuse Pool
     * @param _fusePoolId Fuse Pool ID
     * @param _collateralToken address of the collateralToken
     */
    function getCTokenByUnderlying(uint256 _fusePoolId, address _collateralToken)
        internal
        view
        returns (address _cToken)
    {
        address _comptroller = getComptroller(_fusePoolId);
        require(_comptroller != address(0), "rari-fuse-invalid-comptroller");
        // WETH
        if (_collateralToken == 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2) {
            // cETH is mapped with 0x0
            _collateralToken = address(0x0);
        }
        _cToken = IComptroller(_comptroller).cTokensByUnderlying(_collateralToken);
        require(_cToken != address(0), "rari-fuse-invalid-ctoken");
    }

    // Automatically finds rewardToken set for the current Fuse Pool
    function getRewardToken(uint256 _fusePoolId)
        internal
        view
        returns (address _rewardDistributor, address _rewardToken)
    {
        uint256 _success;
        address _comptroller = getComptroller(_fusePoolId);
        bytes4 _selector = IComptroller(getComptroller(_fusePoolId)).rewardsDistributors.selector;

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
            _rewardToken = IRariRewardDistributor(_rewardDistributor).rewardToken();
        }
    }
}
