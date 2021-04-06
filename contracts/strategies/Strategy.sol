// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../Pausable.sol";
import "../UniswapManager.sol";
import "../interfaces/vesper/IStrategy.sol";
import "../interfaces/vesper/IVesperPool.sol";

abstract contract Strategy is IStrategy, Pausable {
    using SafeERC20 for IERC20;

    // solhint-disable-next-line var-name-mixedcase
    UniswapManager public immutable UniMgr;
    IERC20 public immutable collateralToken;
    address public immutable receiptToken;
    address public immutable override pool;
    address internal constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    uint256 internal constant MAX_UINT_VALUE = type(uint256).max;

    constructor(address _pool, address _receiptToken) {
        UniMgr = new UniswapManager();
        pool = _pool;
        collateralToken = IERC20(IVesperPool(_pool).token());
        receiptToken = _receiptToken;
    }

    /**
     * @dev Throws if contract is paused and called by any account other than guardians.
     */
    modifier live() {
        require(!paused || IVesperPool(pool).guardians().contains(_msgSender()), "contract-has-been-paused");
        _;
    }

    /**
     * @dev Throws if called by any account other than pool or governor.
     */
    modifier onlyAuthorized() {
        require(_msgSender() == IVesperPool(pool).governor() || _msgSender() == pool, "caller-is-not-authorized");
        _;
    }

    /**
     * @dev Throws if called by any account other than pool's governor.
     */
    modifier onlyGovernor {
        require(_msgSender() == IVesperPool(pool).governor(), "caller-is-not-the-governor");
        _;
    }

    /**
     * @dev Throws if called by any account other than guardians.
     */
    modifier onlyGuardians() {
        require(IVesperPool(pool).guardians().contains(_msgSender()), "caller-is-not-a-guardian");
        _;
    }

    /**
     * @dev Throws if called by any account other than pool.
     */
    modifier onlyPool() {
        require(_msgSender() == pool, "caller-is-not-the-pool");
        _;
    }

    function pause() external override onlyGuardians {
        _pause();
    }

    function unpause() external override onlyGuardians {
        _unpause();
    }

    // TODO we may not need these 2 functions, these were part of update strategy via controller
    /// @dev Approve all required tokens
    function approveToken() external onlyGuardians {
        _approveToken(0);
        _approveToken(MAX_UINT_VALUE);
    }

    /// @dev Reset approval of all required tokens
    function resetApproval() external onlyGuardians {
        _approveToken(0);
    }

    /**
     * @dev Deposit collateral token into lending pool.
     * @param _amount Amount of collateral token
     */
    function deposit(uint256 _amount) external override onlyGuardians {
        _deposit(_amount);
    }

    /**
     * @notice Deposit all collateral token from pool to other lending pool.
     * Anyone can call it except when paused.
     */
    function depositAll() external override onlyGuardians {
        _deposit(collateralToken.balanceOf(address(this)));
    }

    /**
     * @dev Withdraw collateral token from lending pool.
     * @param _amount Amount of collateral token
     */
    function withdraw(uint256 _amount) external override onlyAuthorized {
        _withdraw(_amount);
    }

    /**
     * @dev Withdraw all collateral. No rebalance earning.
     * Governor only function, called when migrating strategy.
     */
    //TODO: do we need this function or we want to achieve it via rebalance
    function withdrawAll() external override onlyGovernor {
        _withdrawAll();
    }

    /**
     * @dev Rebalance profit, loss and investment of this strategy
     */
    function rebalance() external override onlyGuardians {
        uint256 _excessDebt = IVesperPool(pool).excessDebt(address(this));
        (uint256 _profit, uint256 _loss, uint256 _payback) = _generateReport(_excessDebt);
        IVesperPool(pool).reportEarning(_profit, _loss, _payback);
        _reinvest();
    }

    /**
     * @dev sweep given token to vesper pool
     * @param _fromToken token address to sweep
     */
    // TODO how does this swap works, say we swap anything from pool to pool's feeCollector,
    // which can be different than strategy's feeCollector. For a given strategist, he/she may
    // not want to swap to pool
    function sweepErc20(address _fromToken) external {
        require(!isReservedToken(_fromToken), "not-allowed-to-sweep");
        if (_fromToken == ETH) {
            payable(pool).transfer(address(this).balance);
        } else {
            uint256 _amount = IERC20(_fromToken).balanceOf(address(this));
            IERC20(_fromToken).safeTransfer(pool, _amount);
        }
    }

    /// @dev Returns address of token correspond to collateral token
    //TODO Review this we may not need it
    function token() external view override returns (address) {
        return receiptToken;
    }

    /// @dev Check whether given token is reserved or not. Reserved tokens are not allowed to sweep.
    function isReservedToken(address _token) public view virtual override returns (bool);

    /**
     *  @notice Generate report for current profit and loss. Also liquidate asset to payback
     * excess debt, if any.
     * @param _excessDebt Over limit debt of strategy
     * @return _profit Calculate any realized profit and convert it to collateral, if not already.
     * @return _loss Calculate any loss that strategy has made on investment. Convert into collateral token.
     * @return _payback If strategy has any excess debt, we have to liquidate asset to payback excess debt.
     */
    function _generateReport(uint256 _excessDebt)
        internal
        virtual
        returns (
            uint256 _profit,
            uint256 _loss,
            uint256 _payback
        )
    {
        _profit = _realizeProfit();
        _loss = _realizeLoss();
        _payback = _liquidate(_excessDebt);
    }

    /**
     * @notice Safe swap via Uniswap
     * @dev There are many scenarios when token swap via Uniswap can fail, so this
     * method will wrap Uniswap call in a 'try catch' to make it fail safe.
     * @param _from address of from token
     * @param _to address of to token
     * @param _amount Amount to be swapped
     */
    function _safeSwap(
        address _from,
        address _to,
        uint256 _amount
    ) internal {
        (address[] memory _path, uint256 amountOut) = UniMgr.bestPathFixedInput(_from, _to, _amount);
        if (amountOut != 0) {
            UniMgr.ROUTER().swapExactTokensForTokens(_amount, 1, _path, address(this), block.timestamp + 30);
        }
    }

    function _deposit(uint256 _amount) internal virtual;

    function _withdraw(uint256 _amount) internal virtual;

    function _withdrawAll() internal virtual;

    function _approveToken(uint256 _amount) internal virtual;

    // Some streateies may not have rewards hence they do not need this function.
    //solhint-disable-next-line no-empty-blocks
    function _claimReward() internal virtual {}

    function _liquidate(uint256 _excessDebt) internal virtual returns (uint256 _payback);

    function _realizeProfit() internal virtual returns (uint256 _profit);

    // Some strategies may not need loss calculation, so making it optional
    // solhint-disable-next-line no-empty-blocks
    function _realizeLoss() internal virtual returns (uint256 _loss) {}

    function _reinvest() internal virtual;
}
