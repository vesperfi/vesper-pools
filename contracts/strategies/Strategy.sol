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
    function deposit(uint256 _amount) public override live {
        _updatePendingFee();
        _deposit(_amount);
    }

    /**
     * @notice Deposit all collateral token from pool to other lending pool.
     * Anyone can call it except when paused.
     */
    function depositAll() external virtual live {
        deposit(collateralToken.balanceOf(pool));
    }

    /**
     * @dev Withdraw collateral token from lending pool.
     * @param _amount Amount of collateral token
     */
    function withdraw(uint256 _amount) external override onlyAuthorized {
        _updatePendingFee();
        _withdraw(_amount);
    }

    /**
     * @dev Withdraw all collateral. No rebalance earning.
     * Governor only function, called when migrating strategy.
     */
    function withdrawAll() external override onlyGovernor {
        _withdrawAll();
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

    /// @dev Returns true if strategy can be upgraded.
    // TODO get new logic in here
    function isUpgradable() external view override returns (bool) {
        return totalLocked() == 0;
    }

    /// @dev Returns address of token correspond to collateral token
    //TODO Review this we may not need it
    function token() external view override returns (address) {
        return receiptToken;
    }

    /// @dev Check whether given token is reserved or not. Reserved tokens are not allowed to sweep.
    function isReservedToken(address _token) public view virtual override returns (bool);

    /// @dev Returns total collateral locked here
    // TODO I think this can be removed when we start writing logic for strategy
    function totalLocked() public view virtual override returns (uint256);

    /**
     * @notice Handle earned interest fee
     * @dev Earned interest fee will go to the fee collector. We want fee to be in form of Vepseer
     * pool tokens not in collateral tokens so we will deposit fee in Vesper pool and send vTokens
     * to fee collactor.
     * @param _fee Earned interest fee in collateral token.
     */
    //TODO we will not be handling any type of fee in strategy
    function _handleFee(uint256 _fee) internal virtual {
        if (_fee != 0) {
            IVesperPool(pool).deposit(_fee);
            uint256 _feeInVTokens = IERC20(pool).balanceOf(address(this));
            IERC20(pool).safeTransfer(IVesperPool(pool).feeCollector(), _feeInVTokens);
        }
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

    function _approveToken(uint256 _amount) internal virtual;

    function _updatePendingFee() internal virtual;

    function _withdrawAll() internal virtual;

    function _claimReward() internal virtual;
}
