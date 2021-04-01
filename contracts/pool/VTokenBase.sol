// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./PoolShareToken.sol";
import "../interfaces/uniswap/IUniswapV2Router02.sol";
import "../interfaces/vesper/IStrategy.sol";

// TODO integrate with sol-address-list for multiple items i.e. list of guardians, etc
// TODO redesign hooks to support ETH as well, we can live without this though
contract VTokenBase is PoolShareToken {
    using SafeERC20 for IERC20;
    struct StrategyParam {
        uint256 activation; // activation block
        uint256 interestFee; // Strategy fee
        uint256 debtLimit; // Absolute limit
        uint256 totalDebt; // Total outstanding debt stratgy has
        uint256 totalGain; // Total gain that strategy has realized
        uint256 totalLoss; // Total loss that strategy has realized
    }

    mapping(address => StrategyParam) public strategy;

    address[] public strategies;
    address[] public withdrawQueue;
    IAddressList public immutable guardians;
    address internal constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    uint256 public constant MAX_STRATEGIES = 5;

    event AddStrategy(address indexed strategy, uint256 interestFee, uint256 debtLimit);

    constructor(
        string memory name,
        string memory symbol,
        address _token,
        address _controller
    ) PoolShareToken(name, symbol, _token, _controller) {
        require(_controller != address(0), "Controller address is zero");
        IAddressListFactory factory = IAddressListFactory(0xD57b41649f822C51a73C44Ba0B3da4A880aF0029);
        IAddressList _guardians = IAddressList(factory.createList());
        //TODO only msg.sender will be able to add more guardians after deploying pool, is it okay?
        _guardians.add(msg.sender);
        guardians = _guardians;
    }

    modifier onlyGuardian() {
        //TODO check caller is in guardian list
        // require(address(controller) == _msgSender(), "Caller is not the controller");
        _;
    }

    modifier onlyStrategy() {
        //TODO check caller is active strategy
        // require(address(controller) == _msgSender(), "Caller is not the controller");
        _;
    }

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

    /// @dev Add strategy
    function addStrategy(
        address _strategy,
        uint256 _activation,
        uint256 _interestFee,
        uint256 _debtLimit
    ) public onlyGuardian {
        require(_strategy != address(0), "address-zero");
        require(strategy[_strategy].activation == 0, "strategy-already-added");
        require(_activation >= block.number, "activation-block-is-past");
        require(_debtLimit > 0, "limit-is-zero");
        require(strategies.length < MAX_STRATEGIES, "too-many-strategies");
        strategies.push(_strategy);
        StrategyParam memory newStrategy =
            StrategyParam({
                activation: _activation,
                interestFee: _interestFee,
                debtLimit: _debtLimit,
                totalDebt: 0,
                totalGain: 0,
                totalLoss: 0
            });
        strategy[_strategy] = newStrategy;
        emit AddStrategy(_strategy, _interestFee, _debtLimit);
    }

    // TODO complete implementations
    function addGuardin(address _guardian) external onlyGuardian {}

    function reportEarning(uint256 profit, uint256 loss, uint256 assetValue) external onlyStrategy {
        // TODO: update pool asset value
        // TODO: update debt limit of strategy
        // TODO: give or take collateral to strategy
        // TODO: handle fee
    }

    function updateInterestFee(address _strategy, uint256 _interestFee) external onlyGuardian {}

    /// @dev Update strategy param
    function updateDebtLimit(address _strategy, uint256 _debtLimit) public onlyGuardian {
        require(_strategy != address(0), "address-zero");
        require(strategy[_strategy].activation != 0, "strategy-not-active");
        strategy[_strategy].debtLimit = _debtLimit;
    }

 
    /// @dev update withdrawl queue
    // TODO: make sure all strategy are in withdraw queue
    // TODO: what happen if a strategy has fund but it is removed from withdraw queue?
    function updateWithdrawQueue(address[] memory _withdrawQueue) public onlyGuardian {
        require(_withdrawQueue.length > 0, "withdrawal-queue-blank");
        for (uint256 i = 0; i < _withdrawQueue.length; i++) {
            require(strategy[_withdrawQueue[i]].activation != 0, "invalid-strategy");
        }
        withdrawQueue = _withdrawQueue;
    }


    /**
     * @dev Convert given ERC20 token into collateral token via Uniswap
     * @param _erc20 Token address
     */
    function sweepErc20(address _erc20) external virtual onlyGuardian {
        _sweepErc20(_erc20);
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

    // TODO DO we want to sweep tokens to revenue splitter or just use uniswap
    function _sweepErc20(address _from) internal {
        require(_from != address(token) && _from != address(this), "Not allowed to sweep");
        IUniswapV2Router02 uniswapRouter = IUniswapV2Router02(controller.uniswapRouter());
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
