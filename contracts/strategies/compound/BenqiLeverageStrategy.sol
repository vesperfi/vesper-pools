// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./CompoundLeverageAvalancheCore.sol";

// solhint-disable no-empty-blocks

/// @title This strategy will deposit collateral token in Benqi and based on position
/// it will borrow same collateral token. It will use borrowed asset as supply and borrow again.
contract BenqiLeverageStrategy is CompoundLeverageAvalancheCore {
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
}
