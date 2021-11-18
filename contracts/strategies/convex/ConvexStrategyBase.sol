// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;
import "../../interfaces/convex/IConvex.sol";
import "../../interfaces/convex/IConvexToken.sol";

// Convex Strategies common variables and helper functions
abstract contract ConvexStrategyBase {
    address public constant CVX = 0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B;
    address public constant BOOSTER = 0xF403C135812408BFbE8713b5A23a04b3D48AAE31;
    address public immutable cvxCrvRewards;
    uint256 public immutable convexPoolId;
    bool public isClaimRewards;
    bool public isClaimExtras;
    uint256 internal constant SUSHISWAP_ROUTER_INDEX = 1;

    constructor(address _crvLp, uint256 _convexPoolId) {
        (address _lp, , , address _reward, , ) = IConvex(BOOSTER).poolInfo(_convexPoolId);
        require(_lp == address(_crvLp), "incorrect-lp-token");
        cvxCrvRewards = _reward;
        convexPoolId = _convexPoolId;
    }

    function _calculateCVXRewards(uint256 _claimableCrvRewards) internal view returns (uint256 _total) {
        // CVX Rewards are minted based on CRV rewards claimed upon withdraw
        // This will calculate the CVX amount based on CRV rewards accrued
        // without having to claim CRV rewards first
        // ref 1: https://github.com/convex-eth/platform/blob/main/contracts/contracts/Cvx.sol#L61-L76
        // ref 2: https://github.com/convex-eth/platform/blob/main/contracts/contracts/Booster.sol#L458-L466

        uint256 _reductionPerCliff = IConvexToken(CVX).reductionPerCliff();
        uint256 _totalSupply = IConvexToken(CVX).totalSupply();
        uint256 _maxSupply = IConvexToken(CVX).maxSupply();
        uint256 _cliff = _totalSupply / _reductionPerCliff;
        uint256 _totalCliffs = 1000;

        if (_cliff < _totalCliffs) {
            //for reduction% take inverse of current cliff
            uint256 _reduction = _totalCliffs - _cliff;
            //reduce
            _total = (_claimableCrvRewards * _reduction) / _totalCliffs;

            //supply cap check
            uint256 _amtTillMax = _maxSupply - _totalSupply;
            if (_total > _amtTillMax) {
                _total = _amtTillMax;
            }
        }
    }
}
