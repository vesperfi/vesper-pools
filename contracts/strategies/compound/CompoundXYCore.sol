// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../../dependencies/openzeppelin/contracts/utils/math/Math.sol";
import "../Strategy.sol";
import "../../interfaces/compound/ICompound.sol";
import "../../interfaces/oracle/IUniswapV3Oracle.sol";

// solhint-disable no-empty-blocks

/// @title This strategy will deposit collateral token in Compound and based on position it will
/// borrow another token. Supply X borrow Y and keep borrowed amount here.
/// It does not handle rewards and ETH as collateral
abstract contract CompoundXYCore is Strategy {
    using SafeERC20 for IERC20;

    // solhint-disable-next-line var-name-mixedcase
    string public NAME;
    string public constant VERSION = "4.0.0";

    uint256 internal constant MAX_BPS = 10_000; //100%
    uint32 internal constant TWAP_PERIOD = 3_600;
    uint256 public minBorrowLimit = 7_000; // 70% of actual collateral factor of protocol
    uint256 public maxBorrowLimit = 8_500; // 85% of actual collateral factor of protocol
    address public borrowToken;

    Comptroller public comptroller;

    CToken public immutable supplyCToken;
    CToken public immutable borrowCToken;

    IUniswapV3Oracle internal constant ORACLE = IUniswapV3Oracle(0x0F1f5A87f99f0918e6C81F16E59F3518698221Ff);

    event UpdatedBorrowLimit(
        uint256 previousMinBorrowLimit,
        uint256 newMinBorrowLimit,
        uint256 previousMaxBorrowLimit,
        uint256 newMaxBorrowLimit
    );

    constructor(
        address _pool,
        address _swapManager,
        address _comptroller,
        address _receiptToken,
        address _borrowCToken,
        string memory _name
    ) Strategy(_pool, _swapManager, _receiptToken) {
        require(_receiptToken != address(0), "cToken-address-is-zero");
        require(_comptroller != address(0), "comptroller-address-is-zero");

        NAME = _name;

        comptroller = Comptroller(_comptroller);
        supplyCToken = CToken(_receiptToken);
        borrowCToken = CToken(_borrowCToken);
        borrowToken = _getUnderlyingToken(_borrowCToken);

        address[] memory _cTokens = new address[](2);
        _cTokens[0] = _receiptToken;
        _cTokens[1] = _borrowCToken;
        comptroller.enterMarkets(_cTokens);
    }

    /// @notice Calculate current position based on totalValue and debt of strategy
    function isLossMaking() external view returns (bool) {
        return totalValue() < IVesperPool(pool).totalDebtOf(address(this));
    }

    function isReservedToken(address _token) public view virtual override returns (bool) {
        return _token == address(supplyCToken) || _token == address(collateralToken) || _token == borrowToken;
    }

    /// @notice Calculate total value based on supply and borrow position
    function totalValue() public view virtual override returns (uint256 _totalValue) {
        uint256 _collateralInCompound =
            (supplyCToken.balanceOf(address(this)) * supplyCToken.exchangeRateStored()) / 1e18;

        uint256 _borrowBalanceHere = _getBorrowBalance();
        uint256 _borrowInCompound = borrowCToken.borrowBalanceStored(address(this));

        uint256 _collateralNeededForRepay;
        if (_borrowInCompound > _borrowBalanceHere) {
            (, _collateralNeededForRepay, ) = swapManager.bestInputFixedOutput(
                address(collateralToken),
                borrowToken,
                _borrowInCompound - _borrowBalanceHere
            );
        }
        _totalValue = _collateralInCompound + collateralToken.balanceOf(address(this)) - _collateralNeededForRepay;
    }

    /// @dev Hook that executes after collateral borrow.
    function _afterBorrowY(uint256 _amount) internal virtual {}

    /// @dev Approve dex router
    function _approveRouter(address _router, uint256 _amount) internal virtual {}

    /// @notice Approve all required tokens
    function _approveToken(uint256 _amount) internal virtual override {
        collateralToken.safeApprove(pool, _amount);
        collateralToken.safeApprove(address(supplyCToken), _amount);
        IERC20(borrowToken).safeApprove(address(borrowCToken), _amount);
        for (uint256 i = 0; i < swapManager.N_DEX(); i++) {
            address _router = address(swapManager.ROUTERS(i));
            _approveRouter(_router, _amount);
            collateralToken.safeApprove(_router, _amount);
            IERC20(borrowToken).safeApprove(_router, _amount);
        }
    }

    /**
     * @notice Claim rewardToken and transfer to new strategy
     * @param _newStrategy Address of new strategy.
     */
    function _beforeMigration(address _newStrategy) internal override {
        require(IStrategy(_newStrategy).token() == address(supplyCToken), "wrong-receipt-token");
        _repay(borrowCToken.borrowBalanceCurrent(address(this)), false);
    }

    /// @dev Hook that executes before repaying borrowed collateral
    function _beforeRepayY(uint256 _amount) internal virtual {}

    /// @dev Borrow Y from Compound. _afterBorrowY hook can be used to do anything with borrowed amount.
    /// @dev Override to handle ETH
    function _borrowY(uint256 _amount) internal virtual {
        if (_amount > 0) {
            require(borrowCToken.borrow(_amount) == 0, "borrow-failed");
            _afterBorrowY(_amount);
        }
    }

    /**
     * @notice Calculate borrow and repay amount based on current collateral and new deposit/withdraw amount.
     * @param _depositAmount deposit amount
     * @param _withdrawAmount withdraw amount
     * @return _borrowAmount borrow more amount
     * @return _repayAmount repay amount to keep ltv within limit
     */
    function _calculateBorrowPosition(uint256 _depositAmount, uint256 _withdrawAmount)
        internal
        returns (uint256 _borrowAmount, uint256 _repayAmount)
    {
        require(_depositAmount == 0 || _withdrawAmount == 0, "all-input-gt-zero");
        uint256 _borrowed = borrowCToken.borrowBalanceCurrent(address(this));
        // If maximum borrow limit set to 0 then repay borrow
        if (maxBorrowLimit == 0) {
            return (0, _borrowed);
        }

        uint256 _collateral = supplyCToken.balanceOfUnderlying(address(this));
        uint256 _collateralFactor = _getCollateralFactor(address(supplyCToken));
        // In case of withdraw, _amount can be greater than _supply
        uint256 _hypotheticalCollateral =
            _depositAmount > 0 ? _collateral + _depositAmount : _collateral > _withdrawAmount
                ? _collateral - _withdrawAmount
                : 0;

        // Calculate max borrow based on collateral factor
        uint256 _maxCollateralForBorrow = (_hypotheticalCollateral * _collateralFactor) / 1e18;
        Oracle _oracle = Oracle(comptroller.oracle());

        // Compound "UnderlyingPrice" decimal = (30 + 6 - tokenDecimal)
        // Rari "UnderlyingPrice" decimal = (30 + 6 - tokenDecimal)
        // Iron "UnderlyingPrice" decimal = (18 + 8 - tokenDecimal)
        uint256 _collateralTokenPrice = _oracle.getUnderlyingPrice(address(supplyCToken));
        uint256 _borrowTokenPrice = _oracle.getUnderlyingPrice(address(borrowCToken));
        // Max borrow limit in borrow token
        uint256 _maxBorrowPossible = (_maxCollateralForBorrow * _collateralTokenPrice) / _borrowTokenPrice;
        // If maxBorrow is zero, we should repay total amount of borrow
        if (_maxBorrowPossible == 0) {
            return (0, _borrowed);
        }

        // Safe buffer to avoid liquidation due to price variations.
        uint256 _borrowUpperBound = (_maxBorrowPossible * maxBorrowLimit) / MAX_BPS;

        // Borrow up to _borrowLowerBound and keep buffer of _borrowUpperBound - _borrowLowerBound for price variation
        uint256 _borrowLowerBound = (_maxBorrowPossible * minBorrowLimit) / MAX_BPS;

        // If current borrow is greater than max borrow, then repay to achieve safe position else borrow more.
        if (_borrowed > _borrowUpperBound) {
            // If borrow > upperBound then it is greater than lowerBound too.
            _repayAmount = _borrowed - _borrowLowerBound;
        } else if (_borrowLowerBound > _borrowed) {
            _borrowAmount = _borrowLowerBound - _borrowed;
        }
    }

    /**
     * @notice Generate report for pools accounting and also send profit and any payback to pool.
     * @dev Claim rewardToken and first convert rewardToken to borrowToken to cover interest, if any, on borrowed amount.
     * Convert remaining rewardToken to collateral.
     */
    function _generateReport()
        internal
        override
        returns (
            uint256 _profit,
            uint256 _loss,
            uint256 _payback
        )
    {
        uint256 _excessDebt = IVesperPool(pool).excessDebt(address(this));
        uint256 _totalDebt = IVesperPool(pool).totalDebtOf(address(this));

        // Claim any reward we have.
        _claimRewardsAndConvertTo(address(collateralToken));

        uint256 _borrow = borrowCToken.borrowBalanceCurrent(address(this));
        uint256 _borrowBalanceHere = _getBorrowBalance();
        // _borrow increases every block. There can be a scenario when rewardToken are not
        // enough to cover interest diff for borrow, reinvest function will handle
        // collateral liquidation
        if (_borrow > _borrowBalanceHere) {
            _swapToBorrowToken(_borrow - _borrowBalanceHere);
        } else {
            // When _borrowBalanceHere exceeds _borrow balance from Compound
            // Customize this hook to handle the excess profit
            _rebalanceBorrow(_borrowBalanceHere - _borrow);
        }

        uint256 _collateralHere = collateralToken.balanceOf(address(this));
        uint256 _collateralInCompound = supplyCToken.balanceOfUnderlying(address(this));
        uint256 _totalCollateral = _collateralInCompound + _collateralHere;

        if (_totalCollateral > _totalDebt) {
            _profit = _totalCollateral - _totalDebt;
        } else {
            _loss = _totalDebt - _totalCollateral;
        }
        uint256 _profitAndExcessDebt = _profit + _excessDebt;
        if (_collateralHere < _profitAndExcessDebt) {
            uint256 _totalAmountToWithdraw = Math.min((_profitAndExcessDebt - _collateralHere), _collateralInCompound);
            if (_totalAmountToWithdraw > 0) {
                _withdrawHere(_totalAmountToWithdraw);
                _collateralHere = collateralToken.balanceOf(address(this));
            }
        }

        if (_excessDebt > 0) {
            _payback = Math.min(_collateralHere, _excessDebt);
        }
    }

    /// @dev Get the borrow balance strategy is holding. Override to handle vToken balance.
    function _getBorrowBalance() internal view virtual returns (uint256) {
        return IERC20(borrowToken).balanceOf(address(this));
    }

    /// @dev TraderJoe Compound fork has different markets API so allow this method to override.
    function _getCollateralFactor(address _cToken) internal view virtual returns (uint256 _collateralFactor) {
        (, _collateralFactor, ) = comptroller.markets(_cToken);
    }

    /// @dev Get underlying token. Compound handle ETH differently hence allow this method to override
    function _getUnderlyingToken(address _cToken) internal view virtual returns (address) {
        return CToken(_cToken).underlying();
    }

    /// @dev Deposit collateral aka X in Compound. Override to handle ETH
    function _mintX(uint256 _amount) internal virtual {
        if (_amount > 0) {
            require(supplyCToken.mint(_amount) == 0, "supply-failed");
        }
    }

    /// @dev Hook to handle profit scenario i.e. actual borrowed balance > Compound borrow account.
    function _rebalanceBorrow(uint256 _excessBorrow) internal virtual {}

    /// @dev Withdraw collateral aka X from Compound. Override to handle ETH
    function _redeemX(uint256 _amount) internal virtual {
        require(supplyCToken.redeemUnderlying(_amount) == 0, "withdraw-failed");
    }

    /// @dev Deposit collateral in Compound and adjust borrow position
    function _reinvest() internal override {
        uint256 _collateralBalance = collateralToken.balanceOf(address(this));

        (uint256 _borrowAmount, uint256 _repayAmount) = _calculateBorrowPosition(_collateralBalance, 0);
        if (_repayAmount > 0) {
            // Repay to maintain safe position
            _repay(_repayAmount, false);
            _mintX(collateralToken.balanceOf(address(this)));
        } else {
            // Happy path, mint more borrow more
            _mintX(_collateralBalance);
            _borrowY(_borrowAmount);
        }
    }

    /**
     * @dev Repay borrow amount
     * @dev Claim rewardToken and convert to collateral. Swap collateral to borrowToken as needed.
     * @param _repayAmount BorrowToken amount that we should repay to maintain safe position.
     * @param _shouldClaimComp Flag indicating should we claim rewardToken and convert to collateral or not.
     */
    function _repay(uint256 _repayAmount, bool _shouldClaimComp) internal {
        if (_repayAmount > 0) {
            uint256 _borrowBalanceHere = _getBorrowBalance();
            // Liability is more than what we have.
            // To repay loan - convert all rewards to collateral, if asked, and redeem collateral(if needed).
            // This scenario is rare and if system works okay it will/might happen during final repay only.
            if (_repayAmount > _borrowBalanceHere) {
                if (_shouldClaimComp) {
                    // Claim rewardToken and convert those to collateral.
                    _claimRewardsAndConvertTo(address(collateralToken));
                }

                uint256 _currentBorrow = borrowCToken.borrowBalanceCurrent(address(this));
                // For example this is final repay and 100 blocks has passed since last withdraw/rebalance,
                // _currentBorrow is increasing due to interest. Now if _repayAmount > _borrowBalanceHere is true
                // _currentBorrow > _borrowBalanceHere is also true.
                // To maintain safe position we always try to keep _currentBorrow = _borrowBalanceHere

                // Swap collateral to borrowToken to repay borrow and also maintain safe position
                // Here borrowToken amount needed is (_currentBorrow - _borrowBalanceHere)
                _swapToBorrowToken(_currentBorrow - _borrowBalanceHere);
            }
            _repayY(_repayAmount);
        }
    }

    /// @dev Repay Y to Compound. _beforeRepayY hook can be used for pre-repay actions.
    /// @dev Override this to handle ETH
    function _repayY(uint256 _amount) internal virtual {
        _beforeRepayY(_amount);
        require(borrowCToken.repayBorrow(_amount) == 0, "repay-failed");
    }

    /// @dev Safe swap, it will not revert.
    function _safeSwap(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn
    ) private {
        uint256 _minAmountOut =
            swapSlippage != 10000
                ? _calcAmtOutAfterSlippage(
                    ORACLE.assetToAsset(_tokenIn, _amountIn, _tokenOut, TWAP_PERIOD),
                    swapSlippage
                )
                : 1;
        _safeSwap(_tokenIn, _tokenOut, _amountIn, _minAmountOut);
    }

    /**
     * @dev Swap given token to borrowToken
     * @param _shortOnBorrow Expected output of this swap
     */
    function _swapToBorrowToken(uint256 _shortOnBorrow) internal {
        // Looking for _amountIn using fixed output amount
        (address[] memory _path, uint256 _amountIn, uint256 _rIdx) =
            swapManager.bestInputFixedOutput(address(collateralToken), borrowToken, _shortOnBorrow);
        if (_amountIn > 0) {
            uint256 _collateralHere = collateralToken.balanceOf(address(this));
            // If we do not have enough _from token to get expected output, either get
            // some _from token or adjust expected output.
            if (_amountIn > _collateralHere) {
                // Redeem some collateral, so that we have enough collateral to get expected output
                _redeemX(_amountIn - _collateralHere);
            }
            swapManager.ROUTERS(_rIdx).swapTokensForExactTokens(
                _shortOnBorrow,
                _amountIn,
                _path,
                address(this),
                block.timestamp
            );
        }
    }

    /// @dev Withdraw collateral and transfer it to pool
    function _withdraw(uint256 _amount) internal override {
        collateralToken.safeTransfer(pool, _withdrawHere(_amount));
    }

    /// @dev Withdraw collateral here. Do not transfer to pool
    function _withdrawHere(uint256 _amount) internal returns (uint256) {
        (, uint256 _repayAmount) = _calculateBorrowPosition(0, _amount);
        _repay(_repayAmount, true);
        uint256 _collateralBefore = collateralToken.balanceOf(address(this));
        uint256 _supply = supplyCToken.balanceOfUnderlying(address(this));
        _redeemX(_supply > _amount ? _amount : _supply);
        return collateralToken.balanceOf(address(this)) - _collateralBefore;
    }

    /************************************************************************************************
     *                          Governor/admin/keeper function                                      *
     ***********************************************************************************************/
    /**
     * @notice Recover extra borrow tokens from strategy
     * @dev If we get liquidation in Compound, we will have borrowToken sitting in strategy.
     * This function allows to recover idle borrow token amount.
     * @param _amountToRecover Amount of borrow token we want to recover in 1 call.
     *      Set it 0 to recover all available borrow tokens
     */
    function recoverBorrowToken(uint256 _amountToRecover) external onlyKeeper {
        uint256 _borrowBalanceHere = IERC20(borrowToken).balanceOf(address(this));
        uint256 _borrowInCompound = borrowCToken.borrowBalanceStored(address(this));

        if (_borrowBalanceHere > _borrowInCompound) {
            uint256 _extraBorrowBalance = _borrowBalanceHere - _borrowInCompound;
            uint256 _recoveryAmount =
                (_amountToRecover > 0 && _extraBorrowBalance > _amountToRecover)
                    ? _amountToRecover
                    : _extraBorrowBalance;
            // Do swap and transfer
            uint256 _collateralBefore = collateralToken.balanceOf(address(this));
            _safeSwap(borrowToken, address(collateralToken), _recoveryAmount);
            collateralToken.transfer(pool, collateralToken.balanceOf(address(this)) - _collateralBefore);
        }
    }

    /**
     * @notice Repay all borrow amount and set min borrow limit to 0.
     * @dev This action usually done when loss is detected in strategy.
     * @dev 0 borrow limit make sure that any future rebalance do not borrow again.
     */
    function repayAll() external onlyKeeper {
        _repay(borrowCToken.borrowBalanceCurrent(address(this)), true);
        minBorrowLimit = 0;
        maxBorrowLimit = 0;
    }

    /**
     * @notice Update upper and lower borrow limit. Usually maxBorrowLimit < 100% of actual collateral factor of protocol.
     * @dev It is possible to set 0 as _minBorrowLimit to not borrow anything
     * @param _minBorrowLimit It is % of actual collateral factor of protocol
     * @param _maxBorrowLimit It is % of actual collateral factor of protocol
     */
    function updateBorrowLimit(uint256 _minBorrowLimit, uint256 _maxBorrowLimit) external onlyGovernor {
        require(_maxBorrowLimit < MAX_BPS, "invalid-max-borrow-limit");
        // set _maxBorrowLimit and _minBorrowLimit to zero to disable borrow;
        require(
            (_maxBorrowLimit == 0 && _minBorrowLimit == 0) || _maxBorrowLimit > _minBorrowLimit,
            "max-should-be-higher-than-min"
        );
        emit UpdatedBorrowLimit(minBorrowLimit, _minBorrowLimit, maxBorrowLimit, _maxBorrowLimit);
        // To avoid liquidation due to price variations maxBorrowLimit is a collateral factor that is less than actual collateral factor of protocol
        minBorrowLimit = _minBorrowLimit;
        maxBorrowLimit = _maxBorrowLimit;
    }

    // We overridden _generateReport which eliminates need of below function.
    function _liquidate(uint256 _excessDebt) internal override returns (uint256 _payback) {}

    function _realizeProfit(uint256 _totalDebt) internal virtual override returns (uint256) {}

    function _realizeLoss(uint256 _totalDebt) internal view override returns (uint256 _loss) {}
}
