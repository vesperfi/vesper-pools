// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PoolStorageV1 {
    IERC20 public token; // Collateral token

    address public poolRewards; // PoolRewards contract address
    address public feeWhitelist; // sol-address-list address which contains whitelisted addresses to withdraw without fee
    address public keepers; // sol-address-list address which contains addresses of keepers
    address public maintainers; // sol-address-list address which contains addresses of maintainers
    address public feeCollector; // Fee collector address
    uint256 public withdrawFee; // Withdraw fee for this pool

    uint256 public totalDebtRatio; // Total debt ratio. This will keep some buffer amount in pool
    uint256 public totalDebt; // Total debt. Sum of debt of all strategies.
    address[] public strategies; // Array of strategies
    address[] public withdrawQueue; // Array of strategy in the order in which funds should be withdrawn.

    struct StrategyConfig {
        bool active;
        uint256 interestFee; // Strategy fee
        uint256 debtRate; // Strategy can not borrow large amount in short durations. Can set big limit for trusted strategy
        uint256 lastRebalance; // Timestamp of last rebalance
        uint256 totalDebt; // Total outstanding debt strategy has
        uint256 totalLoss; // Total loss that strategy has realized
        uint256 totalProfit; // Total gain that strategy has realized
        uint256 debtRatio; // % of asset allocation
    }

    mapping(address => StrategyConfig) public strategy; // Strategy address to its configuration

    uint256 public decimalConversionFactor; // It can be used in converting value to/from 18 decimals
}
