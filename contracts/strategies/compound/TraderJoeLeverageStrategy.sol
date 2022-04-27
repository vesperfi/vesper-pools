// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./CompoundLeverageAvalancheCore.sol";
import "../../interfaces/compound/IComptrollerMultiReward.sol";
import "../../interfaces/token/IToken.sol";

// solhint-disable no-empty-blocks

/// @title This strategy will deposit collateral token in TraderJoe and based on position
/// it will borrow same collateral token. It will use borrowed asset as supply and borrow again.
contract TraderJoeLeverageStrategy is CompoundLeverageAvalancheCore {
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
        CompoundLeverageAvalancheCore(
            _pool,
            _swapManager,
            _comptroller,
            _rewardDistributor,
            _rewardToken,
            _aaveAddressProvider,
            _receiptToken,
            _name
        )
    {}

    /**
     * @dev Get Collateral Factor. TraderJoe has different return type for markets() call.
     */
    function _getCollateralFactor() internal view virtual override returns (uint256 _collateralFactor) {
        (, _collateralFactor, ) = TraderJoeComptroller(address(comptroller)).markets(address(cToken));
        // Take 95% of collateralFactor to avoid any rounding issue.
        _collateralFactor = (_collateralFactor * COLLATERAL_FACTOR_LIMIT) / MAX_BPS;
    }
}
