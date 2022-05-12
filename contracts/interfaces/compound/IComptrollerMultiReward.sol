// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;
import "./ICompound.sol";

interface ComptrollerMultiReward {
    function claimReward(uint8 rewardType, address holder) external;

    function rewardDistributor() external view returns (address);
}

interface TraderJoeComptroller {
    function markets(address market)
        external
        view
        returns (
            bool isListed,
            uint256 collateralFactorMantissa,
            uint8 version
        );
}

interface IRewardDistributor {
    function rewardAccrued(uint8 rewardType, address holder) external view returns (uint256);

    function admin() external view returns (address);

    function _setRewardSpeed(
        uint8 rewardType,
        address jToken,
        uint256 rewardSupplySpeed,
        uint256 rewardBorrowSpeed
    ) external;
}
