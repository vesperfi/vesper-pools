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
    }

    mapping(address => StrategyConfig) public strategy;
    uint256 public totalDebtRatio; // this will keep some buffer amount in pool
    uint256 public totalDebt;
    address[] public strategies;
    address[] public withdrawQueue;

    IAddressList public guardians;
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

    constructor(
        string memory name,
        string memory symbol,
        address _token // solhint-disable-next-line no-empty-blocks
    ) PoolShareToken(name, symbol, _token) {}

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

    /**
     * @notice Create guardian list
     * @dev Create list and add governor into the list.
     * NOTE: Any function with onlyGuardian modifier will not work until this function is called.
     */
    function createGuardianList() external onlyGovernor {
        require(address(guardians) == address(0), "guardian-list-already-created");
        IAddressListFactory _factory = IAddressListFactory(0xded8217De022706A191eE7Ee0Dc9df1185Fb5dA3);
        IAddressList _guardians = IAddressList(_factory.createList());
        _guardians.add(governor);
        guardians = _guardians;
    }

    /**
     * @notice Add given address in provided address list.
     * @dev Use it to add guardian in guardians list and to add address in feeWhiteList
     * @param _listToUpdate address of AddressList contract.
     * @param _addressToAdd address which we want to add in AddressList.
     */
    function addInList(address _listToUpdate, address _addressToAdd) external onlyGovernor {
        require(!IAddressList(_listToUpdate).contains(_addressToAdd), "address-already-in-list");
        require(IAddressList(_listToUpdate).add(_addressToAdd), "add-in-list-failed");
    }

    /**
     * @notice Remove given address in provided address list.
     * @dev Use it to remove guardian from guardians list and to remove address from feeWhiteList
     * @param _listToUpdate address of AddressList contract.
     * @param _addressToRemove address which we want to remove from AddressList.
     */
    function removeFromList(address _listToUpdate, address _addressToRemove) external onlyGovernor {
        require(IAddressList(_listToUpdate).contains(_addressToRemove), "address-not-in-list");
        require(IAddressList(_listToUpdate).remove(_addressToRemove), "remove-from-list-failed");
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
            _reportLoss(_msgSender(), _loss);
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
        if (_totalPayback < _creditLine) {
            token.transfer(_msgSender(), _creditLine - _totalPayback);
        } else if (_totalPayback > _creditLine) {
            token.transferFrom(_msgSender(), address(this), _totalPayback - _creditLine);
        }

        if (strategy[_msgSender()].debtRatio == 0 || stopEverything) {
            //TODO: strategy.withdrawAll()
        }
        if (_profit != 0) {
            _transferInterestFee(_profit);
        }
        // TODO: return debt amount or strategy.totalAssert ( if emergency) so that strategy can use this value.
    }

    /**
    @dev debt above current debt limit
    */
    function excessDebt(address _strategy) external view returns (uint256) {
        return _excessDebt(_strategy);
    }

    function withdrawAllFromStrategy(address _strategy) external onlyGovernor {}

    /**
     * @dev Convert given ERC20 token to fee collector
     * @param _token Token address
     */
    function sweepERC20(address _token) external virtual onlyGuardian {
        require(_token != address(token), "not-allowed-to-sweep");
        require(feeCollector != address(0), "fee-collector-not-set");
        IERC20(_token).transfer(feeCollector, IERC20(_token).balanceOf(address(this)));
    }

    /// @dev Returns total value of vesper pool, in terms of collateral token
    function totalValue() public view override returns (uint256) {
        return totalDebt + tokensHere();
    }

    /**
     * @dev After burning hook, it will be called during withdrawal process.
     */
    function _afterBurning(uint256 _amount) internal virtual override returns (uint256) {
        token.safeTransfer(_msgSender(), _amount);
        return _amount;
    }

    function _withdrawCollateral(uint256 _amount) internal virtual {
        // Withdraw amount from queue
        uint256 _debt;
        uint256 _balanceAfter;
        uint256 _balanceBefore;
        uint256 _amountWithdrawn;
        uint256 _amountNeeded = _amount;
        uint256 _totalAmountWithdrawn;
        for (uint256 i; i < withdrawQueue.length; i++) {
            _debt = strategy[withdrawQueue[i]].totalDebt;
            if (_debt == 0) {
                continue;
            }
            if (_amountNeeded > _debt) {
                // Should not withraw more than current debt of strategy.
                _amountNeeded = _debt;
            }
            _balanceBefore = tokensHere();
            IStrategy(withdrawQueue[i]).withdraw(_amountNeeded);
            _balanceAfter = tokensHere();
            _amountWithdrawn = _balanceAfter - _balanceBefore;
            // Adjusting totalDebt. Assuming that during next reportEarning(), strategy will report loss if amountWithdrawn < _amountNeeded
            strategy[withdrawQueue[i]].totalDebt -= _amountWithdrawn;
            totalDebt -= _amountWithdrawn;
            _totalAmountWithdrawn += _amountWithdrawn;
            if (_totalAmountWithdrawn >= _amount) {
                // withdraw done
                break;
            }
            _amountNeeded = _amount - _totalAmountWithdrawn;
        }
    }

    /**
     * @dev Before burning hook.
     * withdraw amount from strategies
     */
    function _beforeBurning(uint256 _share) internal override returns (uint256 actualWithdrawn) {
        uint256 _amount = (_share * pricePerShare()) / 1e18;
        uint256 _balanceNow = tokensHere();
        if (_amount > _balanceNow) {
            _withdrawCollateral(_amount - _balanceNow);
            _balanceNow = tokensHere();
        }
        actualWithdrawn = _balanceNow < _amount ? _balanceNow : _amount;
    }

    function _beforeMinting(uint256 _amount) internal override {
        token.safeTransferFrom(_msgSender(), address(this), _amount);
    }

    /**
    @dev when a strategy report loss, its debtRatio decrease to get fund back quickly.
    */
    function _reportLoss(address _strategy, uint256 _loss) internal {
        uint256 _currentDebt = strategy[_strategy].totalDebt;
        require(_currentDebt >= _loss, "loss-too-high");
        strategy[_strategy].totalLoss += _loss;
        strategy[_strategy].totalDebt -= _loss;
        totalDebt -= _loss;
        uint256 _deltaDebtRatio = _min((_loss * MAX_BPS) / totalValue(), strategy[_strategy].debtRatio);
        strategy[_strategy].debtRatio -= _deltaDebtRatio;
        totalDebtRatio -= _deltaDebtRatio;
    }

    function _excessDebt(address _strategy) internal view returns (uint256) {
        uint256 _currentDebt = strategy[_strategy].totalDebt;
        if (stopEverything) {
            return _currentDebt;
        }
        uint256 _maxDebt = (strategy[_strategy].debtRatio * totalValue()) / MAX_BPS;
        return _currentDebt > _maxDebt ? (_currentDebt - _maxDebt) : 0;
    }

    /**
    @dev available credit limit is calculated based on current debt of pool and strategy, current debt limit of pool and strategy. 
    // credit available = min(pool's debt limit, strategy's debt limit, max debt per rebalance)
    // when some strategy do not pay back outstanding debt, this impact creditline of other strategy if totalDebt of pool >= debtLimit of pool
    */
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
    @dev strategy get interest fee in pool share token
    */
    function _transferInterestFee(uint256 _profit) internal {
        //TODO: get pool token share price after removing the fee amount from totalValue()
        uint256 _fee = (_profit * strategy[_msgSender()].interestFee) / MAX_BPS;
        _fee = _calculateShares(_fee);
        if (_fee != 0) {
            _mint(_msgSender(), _fee);
        }
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
