// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../../interfaces/vesper/IVesperPool.sol";
import "../../../interfaces/aave/IAave.sol";
import "../../Strategy.sol";
import "./CrvA3PoolStrategyBase.sol";

/// @title This strategy will deposit collateral token in Curve Aave 3Pool and earn interest.
contract CrvA3PoolStrategy is CrvA3PoolStrategyBase {
    using SafeERC20 for IERC20;
    address private constant CRV_POOL = 0xDeBF20617708857ebe4F679508E7b7863a8A8EeE;
    address private constant LP = 0xFd2a8fA60Abd58Efe3EeE34dd494cD491dC14900;
    address private constant GAUGE = 0xd662908ADA2Ea1916B3318327A97eB18aD588b5d;
    address private constant STKAAVE = 0x4da27a545c0c5B758a6BA100e3a049001de870f5;
    address private constant AAVE = 0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9;

    constructor(
        address _pool,
        address _swapManager,
        uint256 _collateralIdx,
        string memory _name
    ) CrvA3PoolStrategyBase(_pool, _swapManager, CRV_POOL, LP, GAUGE, _collateralIdx, _name) {
        reservedToken[AAVE] = true;
        reservedToken[STKAAVE] = true;
    }

    function canStartCooldown() public view returns (bool) {
        (uint256 _cooldownStart, , uint256 _unstakeEnd) = cooldownData();
        return _canStartCooldown(_cooldownStart, _unstakeEnd);
    }

    function canUnstake() external view returns (bool) {
        (, uint256 _cooldownEnd, uint256 _unstakeEnd) = cooldownData();
        return _canUnstake(_cooldownEnd, _unstakeEnd);
    }

    function cooldownData()
        public
        view
        returns (
            uint256 _cooldownStart,
            uint256 _cooldownEnd,
            uint256 _unstakeEnd
        )
    {
        _cooldownStart = StakedAave(STKAAVE).stakersCooldowns(address(this));
        _cooldownEnd = _cooldownStart + StakedAave(STKAAVE).COOLDOWN_SECONDS();
        _unstakeEnd = _cooldownEnd + StakedAave(STKAAVE).UNSTAKE_WINDOW();
    }

    function _claimAave() internal returns (uint256) {
        (uint256 _cooldownStart, uint256 _cooldownEnd, uint256 _unstakeEnd) = cooldownData();
        if (_canUnstake(_cooldownEnd, _unstakeEnd)) {
            StakedAave(STKAAVE).redeem(address(this), MAX_UINT_VALUE);
        } else if (_canStartCooldown(_cooldownStart, _unstakeEnd)) {
            StakedAave(STKAAVE).cooldown();
        }
        StakedAave(STKAAVE).claimRewards(address(this), MAX_UINT_VALUE);
        return IERC20(AAVE).balanceOf(address(this));
    }

    function _canUnstake(uint256 _cooldownEnd, uint256 _unstakeEnd) internal view returns (bool) {
        return block.timestamp > _cooldownEnd && block.timestamp <= _unstakeEnd;
    }

    function _canStartCooldown(uint256 _cooldownStart, uint256 _unstakeEnd) internal view returns (bool) {
        return
            StakedAave(STKAAVE).balanceOf(address(this)) != 0 && (_cooldownStart == 0 || block.timestamp > _unstakeEnd);
    }
}
