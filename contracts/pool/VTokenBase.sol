// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./PoolShareToken.sol";
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
        uint256 totalProfit; // Total gain that strategy has realized
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
    uint256 public totalDebt;
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
    uint256 public constant MAX_BPS = 10000;

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
        require(_interestFee <= MAX_BPS, "interest-fee-above-max_bps");
        StrategyConfig memory newStrategy =
            StrategyConfig({
                activation: _activation,
                interestFee: _interestFee,
                debtRatio: _debtRatio,
                lastRebalanceTimestamp: 0,
                totalDebt: 0,
                totalProfit: 0,
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
     * @dev Update debt ratio.  A strategy is retired when debtRatio is 0
     */
    function updateDebtRatio(address _strategy, uint256 _debtRatio) external onlyGovernor {
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

    /**
     * @dev Update maxDebtPerRebalance.  A strategy is retired when maxDebtPerRebalance is 0
     */
    function updateDebtPerRebalance(address _strategy, uint256 _maxDebtPerRebalance) external onlyGovernor {
        require(strategy[_strategy].activation != 0, "strategy-not-active");
        strategy[_strategy].maxDebtPerRebalance = _maxDebtPerRebalance;
        emit UpdatedStrategyDebtParams(
            _strategy,
            strategy[_strategy].debtRatio,
            strategy[_strategy].debtRatePerBlock,
            _maxDebtPerRebalance
        );
    }

    /**
     * @dev Update debtRatePerBlock.  A strategy is retired when debtRatePerBlock is 0
     */
    function updateDebtRate(address _strategy, uint256 _debtRatePerBlock) external onlyGovernor {
        require(strategy[_strategy].activation != 0, "strategy-not-active");
        strategy[_strategy].debtRatePerBlock = _debtRatePerBlock;
        emit UpdatedStrategyDebtParams(
            _strategy,
            strategy[_strategy].debtRatio,
            _debtRatePerBlock,
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

    /**
     @dev Strategy call this in regular interval.
     @param _profit yield generated by strategy. Strategy get performance fee on this amount
     @param _loss  Reduce debt ,also reduce debtRatio, increase loss in record.
     @param _payback strategy willing to payback oustantanding above debtLimit. no performance fee on this amount. 
      when governance has reduced debtRatio of strategy, strategy will report profit and payback amount separately. 
     */
    function reportEarning(
        uint256 _profit,
        uint256 _loss,
        uint256 _payback
    ) external onlyStrategy {
        require(strategy[_msgSender()].activation != 0, "strategy-not-active");
        require(token.balanceOf(_msgSender()) >= (_profit + _payback), "insufficient-balance-in-strategy");
        if (_loss != 0) {
            // reduce strategy total debt
            // reduce debtRatio as penalty
            // update total_loss of strategy for later performance review
        }
        uint256 _overLimitDebt = _excessDebt(_msgSender());
        uint256 _actualPayback = _min(_overLimitDebt, _payback);
        if (_actualPayback != 0) {
            strategy[_msgSender()].totalDebt -= _actualPayback;
            totalDebt -= _actualPayback;
        }
        uint256 _creditLine = _availableCreditLimit(_msgSender());
        if (_creditLine != 0) {
            strategy[_msgSender()].totalDebt += _creditLine;
            totalDebt += _creditLine;
        }
        uint256 _totalPayback = _profit + _actualPayback;
        if (_profit != 0) {
            // TODO: handleFee()
        }
        if (_totalPayback < _creditLine) {
            token.transfer(_msgSender(), _creditLine - _totalPayback);
        } else if (_totalPayback > _creditLine) {
            token.transferFrom(_msgSender(), address(this), _totalPayback - _creditLine);
        }
        if (strategy[_msgSender()].debtRatio == 0 || stopEverything) {
            // strategy.withdrawAll()
        }
    }

    function withdrawAllFromStrategy(address _strategy) external onlyGovernor {}

    function excessDebt(address _strategy) external view returns (uint256) {
        return _excessDebt(_strategy);
    }

    function _excessDebt(address _strategy) internal view returns (uint256) {
        uint256 _maxDebt = (strategy[_strategy].debtRatio * totalValue()) / MAX_BPS;
        uint256 _currentDebt = strategy[_strategy].totalDebt;
        return _currentDebt > _maxDebt ? (_currentDebt - _maxDebt) : 0;
    }

    function _availableCreditLimit(address _strategy) internal view returns (uint256) {
        if (stopEverything) {
            return 0;
        }
        uint256 _totalValue = totalValue();
        uint256 _maxDebt = (strategy[_strategy].debtRatio * _totalValue) / MAX_BPS;
        uint256 _currentDebt = strategy[_strategy].totalDebt;
        if (_currentDebt >= _maxDebt) {
            return 0;
        }
        uint256 _poolDebtLimit = (totalDebtRatio * _totalValue) / MAX_BPS;
        if (totalDebt >= _poolDebtLimit) {
            return 0;
        }
        uint256 _available = _maxDebt - _currentDebt;
        _available = _min(_min(tokensHere(), _available), _poolDebtLimit - totalDebt);
        _available = _min(strategy[_strategy].maxDebtPerRebalance, _available);
        // TODO: strategy max debt per block * total block since last rebalance).
        return _available;
    }

    /**
     * @dev Convert given ERC20 token to fee collector
     * @param _token Token address
     */
    function sweepERC20(address _token) external virtual onlyGuardian {
        require(_token != address(token), "not-allowed-to-sweep");
        IERC20(_token).transfer(feeCollector, IERC20(_token).balanceOf(address(this)));
    }

    /// @dev Returns total value of vesper pool, in terms of collateral token
    function totalValue() public view override returns (uint256) {
        return totalDebt + tokensHere();
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
           // TODO: withdraw from queue
        }
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
