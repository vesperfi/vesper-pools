// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../../interfaces/vesper/IVesperPool.sol";
import "../../../interfaces/aave/IAave.sol";
import "../../Strategy.sol";
import "./CrvA3PoolStrategyBase.sol";

/// @title This strategy will deposit collateral token in Curve Aave 3Pool and earn interest.
contract CrvA3PoolAvaxStrategy is CrvA3PoolStrategyBase {
    using SafeERC20 for IERC20;
    address private constant CRV_POOL = 0x7f90122BF0700F9E7e1F688fe926940E8839F353;
    address private constant LP = 0x1337BedC9D22ecbe766dF105c9623922A27963EC;
    address private constant GAUGE = 0x5B5CFE992AdAC0C9D48E05854B2d91C73a003858;

    constructor(
        address _pool,
        address _swapManager,
        uint256 _collateralIdx,
        string memory _name
    ) CrvA3PoolStrategyBase(_pool, _swapManager, CRV_POOL, LP, GAUGE, _collateralIdx, _name) {
        CRV = 0x47536F17F4fF30e64A96a7555826b8f9e66ec468;
        WETH = 0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB;
        reservedToken[LP] = true;
        reservedToken[CRV] = true;
        delete rewardTokens;
        rewardTokens.push(CRV);
    }

    /// @dev Claimable rewards estimated into pool's collateral value
    function claimableRewardsInCollateral() public view virtual override returns (uint256 rewardAsCollateral) {
        uint256 _claimable;
        for (uint256 i = 0; i < rewardTokens.length; i++) {
            _claimable = ILiquidityGaugeV3(crvGauge).claimable_reward(address(this), rewardTokens[i]);
            if (_claimable > 0) {
                (, uint256 _reward, ) =
                    swapManager.bestOutputFixedInput(rewardTokens[i], address(collateralToken), _claimable);
                rewardAsCollateral += _reward;
            }
        }
    }

    function _claimRewards() internal override {
        ILiquidityGaugeV2(crvGauge).claim_rewards(address(this));
    }
}
