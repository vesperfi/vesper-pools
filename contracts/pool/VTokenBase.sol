// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./PoolShareToken.sol";
import "../interfaces/uniswap/IUniswapV2Router02.sol";
import "../interfaces/vesper/IStrategy.sol";

// TODO redesign hooks to support ETH as well, we can live without this though
contract VTokenBase is PoolShareToken {
    using SafeERC20 for IERC20;

    struct StrategyConfig {
        uint256 activation; // activation block
        uint256 interestFee; // Strategy fee
        uint256 lastRebalanceTimestamp;
        uint256 totalDebt; // Total outstanding debt stratgy has
        uint256 totalLoss; // Total loss that strategy has realized
        uint256 totalGain; // Total gain that strategy has realized
        uint256 debtRatio; // % of asset allocation
        uint256 debtRatePerBlock; // Limit strategy to not borrow maxAllocPerRebalance immediately in next block. This control the speed of debt wheel.
        uint256 maxDebtPerRebalance; // motivate strategy to call and borrow/payback asset from pool in reasonable interval.
        // Example- comments for dev. can remove later
        // available debt limit of strategy = creditLine =  (debtRatio * totalasset)/MAX_BPS
        // debtRate = 1M per block,  available debt limit of strategy = 100M, maxDebtPerRebalance = 20M
        // scenario 1: strategy waited  5000 block to call next rebalance.
        //  available to borrow in this rebalance = min(debtRate*blockCount, maxDebtPerRebalance, creditLine) = 20M
        // scenario 2: strategy waited  5 block to call next rebalance.
        //  available to borrow in this rebalance = min(debtRate*blockCount, maxDebtPerRebalance, creditLine) = 5M
        // scenario 3: strategy waited  25 block to call next rebalance.
        //  available to borrow in this rebalance = min(debtRate*blockCount, maxDebtPerRebalance, creditLine) = 20M
        // if only single strategy is integrated with pool.
        // set maxDebtPerRebalance = uint56(-1),  debtRate = uint56(-1), debtRatio  = MAX_BPS - bufferRatio
        // will discuss it if we we want to use debtRatePerBlock or not.
    }

    mapping(address => StrategyConfig) public strategy;
    uint256 public totalDebtRatio; // this will keep some buffer amount in pool

    address[] public strategies;
    address[] public withdrawQueue;

    IAddressList public immutable guardians;
    address internal constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    event StrategyAdded(
        address indexed strategy,
        uint256 activation,
        uint256 interestFee,
        uint256 debtRatio,
        uint256 debtRatePerBlock,
        uint256 maxDebtPerRebalance
    );
    event UpdatedInterestFee(address indexed strategy, uint256 interestFee);
    event UpdatedStrategyDebtParams(
        address indexed strategy,
        uint256 debtRatio,
        uint256 debtRatePerBlock,
        uint256 maxDebtPerRebalance
    );
    event AddedGuardian(address indexed guardian);
    event RemovedGuardian(address indexed guardian);
    uint256 public constant MAX_BPS = 1000;

    constructor(
        string memory name,
        string memory symbol,
        address _token
    ) PoolShareToken(name, symbol, _token) {
        governor = msg.sender;
        IAddressListFactory _factory = IAddressListFactory(0xD57b41649f822C51a73C44Ba0B3da4A880aF0029);
        IAddressList _guardians = IAddressList(_factory.createList());
        _guardians.add(msg.sender);
        guardians = _guardians;
    }

    modifier onlyGuardian() {
        require(guardians.contains(_msgSender()), "caller-is-not-a-guardian");
        _;
    }

    modifier onlyStrategy() {
        require(strategy[msg.sender].activation != 0, "caller-is-not-active-strategy");
        _;
    }

    ///////////////////////////// Only Guradian ///////////////////////////////
    function pause() external onlyGuardian {
        _pause();
    }

    function unpause() external onlyGuardian {
        _unpause();
    }

    function shutdown() external onlyGuardian {
        _shutdown();
    }

    function open() external onlyGuardian {
        _open();
    }

    ///////////////////////////////////////////////////////////////////////////

    ////////////////////////////// Only Governor //////////////////////////////
    function addGuardian(address _guardian) external onlyGovernor {
        require(!guardians.contains(_guardian), "already-a-guardian");
        guardians.add(_guardian);
        emit AddedGuardian(_guardian);
    }

    function removeGuardian(address _guardian) external onlyGovernor {
        require(guardians.contains(_guardian), "not-a-guardian");
        guardians.remove(_guardian);
        emit RemovedGuardian(_guardian);
    }

    /// @dev Add strategy
    function addStrategy(
        address _strategy,
        uint256 _activation,
        uint256 _interestFee,
        uint256 _debtRatio,
        uint256 _debtRatePerBlock,
        uint256 _maxDebtPerRebalance
    ) public onlyGovernor {
        require(_strategy != address(0), "strategy-address-is-zero");
        require(strategy[_strategy].activation == 0, "strategy-already-added");
        require(_activation >= block.number, "activation-block-is-past");
        totalDebtRatio = totalDebtRatio + _debtRatio;
        require(totalDebtRatio <= MAX_BPS, "totalDebtRatio-above-max_bps");
        StrategyConfig memory newStrategy =
            StrategyConfig({
                activation: _activation,
                interestFee: _interestFee,
                debtRatio: _debtRatio,
                lastRebalanceTimestamp: 0,
                totalDebt: 0,
                totalGain: 0,
                totalLoss: 0,
                debtRatePerBlock: _debtRatePerBlock,
                maxDebtPerRebalance: _maxDebtPerRebalance
            });
        strategy[_strategy] = newStrategy;
        strategies.push(_strategy);
        emit StrategyAdded(_strategy, _activation, _interestFee, _debtRatio, _debtRatePerBlock, _maxDebtPerRebalance);
    }

    function updateInterestFee(address _strategy, uint256 _interestFee) external onlyGovernor {
        require(_strategy != address(0), "strategy-address-is-zero");
        require(strategy[_strategy].activation != 0, "strategy-not-active");
        require(_interestFee <= MAX_BPS, "interest-fee-above-max_bps");
        strategy[_strategy].interestFee = _interestFee;
        emit UpdatedInterestFee(_strategy, _interestFee);
    }

    /**
     * @dev Update debt params.  A strategy is automatically retired when debtRatio or debtRatePerBlock or maxDebtPerRebalance is 0
     * It is preferred to set debtRatio 0 so that it can create
     */
    function updateDebtParams(
        address _strategy,
        uint256 _debtRatio,
        uint256 _debtRatePerBlock,
        uint256 _maxDebtPerRebalance
    ) external onlyGovernor {
        require(_strategy != address(0), "strategy-address-is-zero");
        require(strategy[_strategy].activation != 0, "strategy-not-active");
        totalDebtRatio = totalDebtRatio - strategy[_strategy].debtRatio + _debtRatio;
        require(totalDebtRatio <= MAX_BPS, "totalDebtRatio-above-max_bps");
        strategy[_strategy].debtRatio = _debtRatio;
        // TODO: how does it impact if below two params set 0
        strategy[_strategy].debtRatePerBlock = _debtRatePerBlock;
        strategy[_strategy].maxDebtPerRebalance = _maxDebtPerRebalance;
        emit UpdatedStrategyDebtParams(_strategy, _debtRatio, _debtRatePerBlock, _maxDebtPerRebalance);
    }

    /**
     * @dev Update debt ratio.  A strategy is retired when debtRatio is 0
     */
    function updateDebtRatio(address _strategy, uint256 _debtRatio) external onlyGovernor {
        require(_strategy != address(0), "strategy-address-is-zero");
        require(strategy[_strategy].activation != 0, "strategy-not-active");
        totalDebtRatio = totalDebtRatio - strategy[_strategy].debtRatio + _debtRatio;
        require(totalDebtRatio <= MAX_BPS, "totalDebtRatio-above-max_bps");
        strategy[_strategy].debtRatio = _debtRatio;
        emit UpdatedStrategyDebtParams(
            _strategy,
            _debtRatio,
            strategy[_strategy].debtRatePerBlock,
            strategy[_strategy].maxDebtPerRebalance
        );
    }

    /// @dev update withdrawl queue
    // TODO: make sure all strategy are in withdraw queue
    // TODO: what happen if a strategy has fund but it is removed from withdraw queue?
    function updateWithdrawQueue(address[] memory _withdrawQueue) public onlyGovernor {
        require(_withdrawQueue.length > 0, "withdrawal-queue-blank");
        for (uint256 i = 0; i < _withdrawQueue.length; i++) {
            require(strategy[_withdrawQueue[i]].activation != 0, "invalid-strategy");
        }
        withdrawQueue = _withdrawQueue;
    }

    ///////////////////////////////////////////////////////////////////////////
    // each strategy will call this function in regular interval.
    // This will trigger
    // 1) pay interest fee 2) borrow more asset from pool if creditLine available 3) payback to pool if debt limit decreased.
    // pool share price updated based on reported earning by each strategy. ideally after each rebalance of strategy, reportEarning will be called.
    function reportEarning(
        uint256 profit,
        uint256 loss,
        uint256 assetValue
    ) external onlyStrategy {
        // TODO: update pool asset value
        // TODO: update debt limit of strategy
        // TODO: give or take collateral to strategy
        // TODO: handle fee
    }

    // TODO do we want to keep this as onlyGuardian
    // TODO DO we want to sweep tokens to revenue splitter or just use uniswap
    /**
     * @dev Convert given ERC20 token into collateral token via Uniswap
     * @param _erc20 Token address
     */
    function sweepErc20(address _erc20) external virtual onlyGuardian {
        _sweep(_erc20);
    }

    /// @dev Returns collateral token locked in strategy
    function tokenLocked() public view virtual returns (uint256) {
        uint256 _totalLocked;
        for (uint256 i; i < strategies.length; i++) {
            IStrategy _strategy = IStrategy(strategies[i]);
            _totalLocked = _totalLocked + _strategy.totalLocked();
        }
        return _totalLocked;
    }

    /// @dev Returns total value of vesper pool, in terms of collateral token
    function totalValue() public view override returns (uint256) {
        return tokenLocked() + tokensHere();
    }

    /**
     * @dev After burning hook, it will be called during withdrawal process.
     * It will withdraw collateral from strategy and transfer it to user.
     */
    function _afterBurning(uint256 _amount) internal override {
        _withdrawCollateral(_amount);
        uint256 balanceHere = tokensHere();
        _amount = balanceHere < _amount ? balanceHere : _amount;
        // TODO: if withdraw < amount , burn share proportionally.
        token.safeTransfer(_msgSender(), _amount);
    }

    /**
     * @dev Before burning hook.
     * Some actions, like resurface(), can impact share price and has to be called before withdraw.
     */
    // TODO Try to remove this hook from strategy
    function _beforeBurning(
        uint256 /* shares */
    ) internal override {
        for (uint256 i; i < strategies.length; i++) {
            IStrategy _strategy = IStrategy(strategies[i]);
            _strategy.beforeWithdraw();
        }
    }

    function _beforeMinting(uint256 amount) internal override {
        token.safeTransferFrom(_msgSender(), address(this), amount);
    }

    function _withdrawCollateral(uint256 _amount) internal virtual {
        uint256 poolBalance = tokensHere();
        if (_amount > poolBalance) {
            for (uint256 i; i < withdrawQueue.length; i++) {
                uint256 amountNeeded = _amount - poolBalance;
                IStrategy _strategy = IStrategy(withdrawQueue[i]);
                amountNeeded = _strategy.totalLocked() < amountNeeded ? _strategy.totalLocked() : amountNeeded;
                if (amountNeeded == 0) {
                    continue;
                }
                _strategy.withdraw(amountNeeded);
                poolBalance = tokensHere();
                if (_amount <= poolBalance) {
                    break;
                }
            }
        }
    }

    // TODO we might endup removing uniswap logic from this function
    function _sweep(address _from) internal {
        require(_from != address(token), "not-allowed-to-sweep");
        IUniswapV2Router02 uniswapRouter = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
        uint256 amt = IERC20(_from).balanceOf(address(this));
        IERC20(_from).safeApprove(address(uniswapRouter), 0);
        IERC20(_from).safeApprove(address(uniswapRouter), amt);
        address[] memory path;
        if (address(token) == WETH) {
            path = new address[](2);
            path[0] = _from;
            path[1] = address(token);
        } else {
            path = new address[](3);
            path[0] = _from;
            path[1] = WETH;
            path[2] = address(token);
        }
        uniswapRouter.swapExactTokensForTokens(amt, 1, path, address(this), block.timestamp + 30);
    }
}
