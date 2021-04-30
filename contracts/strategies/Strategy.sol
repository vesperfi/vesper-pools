// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "../UniswapManager.sol";
import "../interfaces/bloq/IAddressList.sol";
import "../interfaces/bloq/IAddressListFactory.sol";
import "../interfaces/vesper/IStrategy.sol";
import "../interfaces/vesper/IVesperPool.sol";

abstract contract Strategy is IStrategy, Context {
    using SafeERC20 for IERC20;

    // solhint-disable-next-line var-name-mixedcase
    UniswapManager public immutable UniMgr;
    IERC20 public immutable collateralToken;
    address public immutable receiptToken;
    address public immutable override pool;
    IAddressList public guardians;
    address public override feeCollector;
    address internal constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    uint256 internal constant MAX_UINT_VALUE = type(uint256).max;

    event UpdatedFeeCollector(address indexed previousFeeCollector, address indexed newFeeCollector);

    constructor(address _pool, address _receiptToken) {
        require(_pool != address(0), "pool-is-zero-address");
        UniMgr = new UniswapManager();
        pool = _pool;
        collateralToken = IERC20(IVesperPool(_pool).token());
        receiptToken = _receiptToken;
    }

    modifier onlyGovernor {
        require(_msgSender() == IVesperPool(pool).governor(), "caller-is-not-the-governor");
        _;
    }

    modifier onlyGuardians() {
        require(guardians.contains(_msgSender()), "caller-is-not-a-guardian");
        _;
    }

    modifier onlyPool() {
        require(_msgSender() == pool, "caller-is-not-vesper-pool");
        _;
    }

    /**
     * @notice Add given address in guardians list.
     * @param _guardianAddress guardian address to add.
     */
    function addGuardian(address _guardianAddress) external onlyGovernor {
        require(!guardians.contains(_guardianAddress), "guardian-already-in-list");
        require(guardians.add(_guardianAddress), "add-guardian-failed");
    }

    /**
     * @notice Create keeper list
     * @dev Create keeper list
     * NOTE: Any function with onlyGuardians modifier will not work until this function is called.
     * NOTE: Due to gas constraint this function cannot be called in constructor.
     */
    function createGaurdianList() external onlyGovernor {
        require(address(guardians) == address(0), "gaurdian-list-already-created");
        // Prepare guardian list
        IAddressListFactory _factory = IAddressListFactory(0xded8217De022706A191eE7Ee0Dc9df1185Fb5dA3);
        IAddressList _guardians = IAddressList(_factory.createList());
        address _governor = IVesperPool(pool).governor();
        require(_guardians.add(_governor), "add-guardian-failed");
        if (_msgSender() != _governor) {
            require(_guardians.add(_msgSender()), "add-guardian-failed");
        }
        guardians = _guardians;
    }

    /**
     * @notice some strategy may want to prpeare before doing migration. 
        Example In Maker old strategy want to give vault ownership to new strategy
     * @param _newStrategy .
     */
    function migrate(address _newStrategy) external virtual override onlyPool {
        require(_newStrategy != address(0), "new-address-is-zero");
        require(IStrategy(_newStrategy).pool() == pool, "not-valid-new-strategy");
        _beforeMigration(_newStrategy);
        IERC20(receiptToken).safeTransfer(_newStrategy, IERC20(receiptToken).balanceOf(address(this)));
        collateralToken.safeTransfer(_newStrategy, collateralToken.balanceOf(address(this)));
    }

    /**
     * @notice Remove given address from guardians list.
     * @param _guardianAddress guardian address to remove.
     */
    function removeGuardian(address _guardianAddress) external onlyGovernor {
        require(guardians.contains(_guardianAddress), "guardian-not-in-list");
        require(guardians.remove(_guardianAddress), "remove-guardian-failed");
    }

    /**
     * @notice Update fee collector
     * @param _feeCollector fee collector address
     */
    function updateFeeCollector(address _feeCollector) external onlyGovernor {
        require(_feeCollector != address(0), "fee-collector-is-zero-address");
        require(_feeCollector != feeCollector, "fee-collector-is-same");
        emit UpdatedFeeCollector(feeCollector, _feeCollector);
        feeCollector = _feeCollector;
    }

    /// @dev Approve all required tokens
    function approveToken() external onlyGuardians {
        _approveToken(0);
        _approveToken(MAX_UINT_VALUE);
    }

    /**
     * @dev Withdraw collateral token from lending pool.
     * @param _amount Amount of collateral token
     */
    function withdraw(uint256 _amount) external override onlyPool {
        _withdraw(_amount);
    }

    /**
     * @notice Withdraw all collateral.
     * @notice Governor only function, called when migrating strategy.
     * @dev File report to pool with proper profit, loss and payback.
     * @dev To make withdrawAll fail safe, we bypass generateReport
     * function and prepared report here.
     */
    function withdrawAll() external override onlyGovernor {
        // Make sure to wtihdraw all collateral here
        _withdrawAll();

        uint256 _totalDebt = IVesperPool(pool).totalDebtOf(address(this));
        uint256 _collateralHere = collateralToken.balanceOf(address(this));
        uint256 _profit;
        uint256 _loss;
        if (_collateralHere > _totalDebt) {
            _profit = _collateralHere - _totalDebt;
        } else {
            _loss = _totalDebt - _collateralHere;
        }
        // Pool has a require check on (payback + profit = collateral in strategy)
        IVesperPool(pool).reportEarning(_profit, _loss, _collateralHere - _profit);
    }

    /**
     * @dev Rebalance profit, loss and investment of this strategy
     */
    function rebalance() external override onlyGuardians {
        (uint256 _profit, uint256 _loss, uint256 _payback) = _generateReport();
        IVesperPool(pool).reportEarning(_profit, _loss, _payback);
        _reinvest();
    }

    /**
     * @dev sweep given token to feeCollector of strategy
     * @param _fromToken token address to sweep
     */
    function sweepERC20(address _fromToken) external override onlyGuardians {
        require(feeCollector != address(0), "fee-collector-not-set");
        require(_fromToken != address(collateralToken), "not-allowed-to-sweep-collateral");
        require(!isReservedToken(_fromToken), "not-allowed-to-sweep");
        if (_fromToken == ETH) {
            payable(feeCollector).transfer(address(this).balance);
        } else {
            uint256 _amount = IERC20(_fromToken).balanceOf(address(this));
            IERC20(_fromToken).safeTransfer(feeCollector, _amount);
        }
    }

    /// @notice Returns address of token correspond to collateral token
    function token() external view override returns (address) {
        return receiptToken;
    }

    /**
     * @notice Calculate total value of asset under management
     * @dev Report total value in collateral token
     */
    function totalValue() external view virtual override returns (uint256 _value);

    /// @notice Check whether given token is reserved or not. Reserved tokens are not allowed to sweep.
    function isReservedToken(address _token) public view virtual override returns (bool);

    /**
     * @notice some strategy may want to prpeare before doing migration. 
        Example In Maker old strategy want to give vault ownership to new strategy
     * @param _newStrategy .
     */
    function _beforeMigration(address _newStrategy) internal virtual;

    /**
     *  @notice Generate report for current profit and loss. Also liquidate asset to payback
     * excess debt, if any.
     * @return _profit Calculate any realized profit and convert it to collateral, if not already.
     * @return _loss Calculate any loss that strategy has made on investment. Convert into collateral token.
     * @return _payback If strategy has any excess debt, we have to liquidate asset to payback excess debt.
     */
    function _generateReport()
        internal
        virtual
        returns (
            uint256 _profit,
            uint256 _loss,
            uint256 _payback
        )
    {
        uint256 _excessDebt = IVesperPool(pool).excessDebt(address(this));
        uint256 _totalDebt = IVesperPool(pool).totalDebtOf(address(this));
        _profit = _realizeProfit(_totalDebt);
        _loss = _realizeLoss(_totalDebt);
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

    function _withdraw(uint256 _amount) internal virtual;

    function _withdrawAll() internal virtual;

    function _approveToken(uint256 _amount) internal virtual;

    // Some streateies may not have rewards hence they do not need this function.
    //solhint-disable-next-line no-empty-blocks
    function _claimRewardsAndConvertTo(address _toToken) internal virtual {}

    /**
     * @notice Withdraw collateral to payback excess debt in pool.
     * @param _excessDebt Excess debt of strategy in collateral token
     * @return _payback amount in collateral token. Usually it is equal to excess debt.
     */
    function _liquidate(uint256 _excessDebt) internal virtual returns (uint256 _payback);

    /**
     * @notice Calculate earning and withdraw/convert it into collateral token.
     * @param _totalDebt Total collateral debt of this strategy
     * @return _profit Profit in collateral token
     */
    function _realizeProfit(uint256 _totalDebt) internal virtual returns (uint256 _profit);

    /**
     * @notice Calculate loss
     * @param _totalDebt Total collateral debt of this strategy
     * @return _loss Realized loss in collateral token
     */
    function _realizeLoss(uint256 _totalDebt) internal virtual returns (uint256 _loss);

    /**
     * @notice Reinvest collateral.
     * @dev Once we file report back in pool, we might have some collateral in hand
     * which we want to reinvest aka deposit in lender/provider.
     */
    function _reinvest() internal virtual;
}
