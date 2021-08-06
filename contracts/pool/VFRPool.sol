// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./VPoolBase.sol";
import "../interfaces/vesper/IPoolAccountant.sol";

// solhint-disable no-empty-blocks
contract VFRPool is VPoolBase {
    string public constant VERSION = "3.0.4";

    uint256 public targetAPY;
    uint256 public startTime;
    uint256 public initialPricePerShare;
    uint256 public lastRebalanceAPY;
    uint256 public tolerance;

    constructor(
        string memory _name,
        string memory _symbol,
        address _token
    ) VPoolBase(_name, _symbol, _token) {}

    function initialize(
        string memory _name,
        string memory _symbol,
        address _token,
        address _poolAccountant,
        address _addressListFactory
    ) public initializer {
        _initializeBase(_name, _symbol, _token, _poolAccountant, _addressListFactory);
    }

    function retarget(uint256 _apy, uint256 _tolerance) external onlyGovernor {
        targetAPY = _apy;
        startTime = block.timestamp;
        initialPricePerShare = pricePerShare();
        lastRebalanceAPY = _apy;
        // Only allow deposits if at the last rebalance the pool's actual APY
        // was not behind the target APY for more than 'tolerance'. Probably
        // a better way to set this is dynamically based on how long the pool
        // has been running for.
        tolerance = _tolerance;
    }

    function targetPricePerShare() public view returns (uint256) {
        return
            initialPricePerShare +
            (initialPricePerShare * targetAPY * (block.timestamp - startTime)) /
            (1e18 * 365 * 24 * 3600);
    }

    function amountToReachTarget(address _strategy) public view returns (uint256) {
        uint256 fromPricePerShare = pricePerShare();
        uint256 toPricePerShare = targetPricePerShare();
        if (fromPricePerShare < toPricePerShare) {
            (, uint256 fee, , , , , , ) = IPoolAccountant(poolAccountant).strategy(_strategy);
            uint256 fromTotalValue = (fromPricePerShare * totalSupply()) / 1e18;
            uint256 toTotalValue = (toPricePerShare * totalSupply()) / 1e18;
            uint256 amountWithoutFee = toTotalValue - fromTotalValue;
            // Take into account the performance fee of the strategy
            return (amountWithoutFee * MAX_BPS) / (MAX_BPS - fee);
        }
        return 0;
    }

    function isOnTarget() internal view returns (bool) {
        // We need to be either above target or below target by no more than the current tolerance
        return lastRebalanceAPY >= targetAPY || (targetAPY - lastRebalanceAPY) <= tolerance;
    }

    function afterRebalance() internal {
        // Update the APY
        lastRebalanceAPY =
            ((pricePerShare() - initialPricePerShare) * (1e18 * 365 * 24 * 3600)) /
            (initialPricePerShare * (block.timestamp - startTime));
    }

    function _deposit(uint256 _amount) internal override {
        // Disallow deposits if the pool is under target
        require(isOnTarget(), "pool-under-target");
        super._deposit(_amount);
    }

    function reportEarning(
        uint256 _profit,
        uint256 _loss,
        uint256 _payback
    ) public override {
        super.reportEarning(_profit, _loss, _payback);
        // Update any needed parameters after every rebalance
        afterRebalance();
    }
}
