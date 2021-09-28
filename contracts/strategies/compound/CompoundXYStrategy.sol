// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "../Strategy.sol";
import "../../interfaces/compound/ICompound.sol";
import "../../interfaces/oracle/IUniswapV3Oracle.sol";
import "../../interfaces/token/IToken.sol";

/// @title This strategy will deposit collateral token in Compound and based on position
/// it will borrow another token. Supply X borrow Y and keep borrowed amount here
abstract contract CompoundXYStrategy is Strategy {
    using SafeERC20 for IERC20;

    uint256 internal constant MAX_BPS = 10_000; //100%
    uint256 public minBorrowLimit = 7_000; // 70%
    uint256 public maxBorrowLimit = 9_000; // 90%
    address public borrowToken;
    CToken public immutable supplyCToken;
    CToken public borrowCToken;
    address internal constant COMP = 0xc00e94Cb662C3520282E6f5717214004A7f26888;
    Comptroller internal constant COMPTROLLER = Comptroller(0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B);
    IUniswapV3Oracle internal constant ORACLE = IUniswapV3Oracle(0x0F1f5A87f99f0918e6C81F16E59F3518698221Ff);
    uint32 internal constant TWAP_PERIOD = 3600;

    event UpdatedBorrowCToken(address indexed previousBorrowCToken, address indexed newBorrowCToken);

    constructor(
        address _pool,
        address _swapManager,
        address _receiptToken,
        address _borrowCToken
    ) Strategy(_pool, _swapManager, _receiptToken) {
        require(_receiptToken != address(0), "cToken-address-is-zero");
        supplyCToken = CToken(_receiptToken);
        borrowCToken = CToken(_borrowCToken);
        borrowToken = _getBorrowToken(_borrowCToken);

        address[] memory _cTokens = new address[](2);
        _cTokens[0] = _receiptToken;
        _cTokens[1] = _borrowCToken;
        COMPTROLLER.enterMarkets(_cTokens);
    }

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
                (_amountToRecover != 0 && _extraBorrowBalance > _amountToRecover)
                    ? _amountToRecover
                    : _extraBorrowBalance;
            // Do swap and transfer
            uint256 _collateralBefore = collateralToken.balanceOf(address(this));
            _safeSwap(borrowToken, address(collateralToken), _recoveryAmount);
            collateralToken.transfer(pool, collateralToken.balanceOf(address(this)) - _collateralBefore);
        }
    }

    /**
     * @notice Update borrow CToken
     * @dev Repay borrow for old borrow CToken and borrow for new borrow CToken
     * @param _newBorrowCToken Address of new CToken
     */
    function updateBorrowCToken(address _newBorrowCToken) external onlyGovernor {
        require(_newBorrowCToken != address(0), "newBorrowCToken-address-is-zero");
        // Repay whole borrow
        _repay(borrowCToken.borrowBalanceCurrent(address(this)), true);

        // Manage market position in Compound
        COMPTROLLER.exitMarket(address(borrowCToken));
        address[] memory _cTokens = new address[](1);
        _cTokens[0] = _newBorrowCToken;
        COMPTROLLER.enterMarkets(_cTokens);

        // Reset approval for old borrowCToken
        IERC20(borrowToken).safeApprove(address(borrowCToken), 0);

        // Update token address
        emit UpdatedBorrowCToken(address(borrowCToken), _newBorrowCToken);
        borrowCToken = CToken(_newBorrowCToken);
        borrowToken = _getBorrowToken(_newBorrowCToken);

        // Approve new borrowCToken
        IERC20(borrowToken).safeApprove(_newBorrowCToken, type(uint256).max);

        // Borrow again
        (uint256 _borrowAmount, ) = _calculateBorrowPosition(0, true);
        _borrowY(_borrowAmount);
    }

    /**
     * @notice Update upper and lower borrow limit
     * @dev It is possible to set 0 as _minBorrowLimit to not borrow anything
     * @param _minBorrowLimit Minimum % we want to borrow
     * @param _maxBorrowLimit Maximum % we want to borrow
     */
    function updateBorrowLimit(uint256 _minBorrowLimit, uint256 _maxBorrowLimit) external onlyGovernor {
        require(_maxBorrowLimit < MAX_BPS, "invalid-max-borrow-limit");
        require(_maxBorrowLimit > _minBorrowLimit, "max-should-be-higher-than-min");
        minBorrowLimit = _minBorrowLimit;
        maxBorrowLimit = _maxBorrowLimit;
    }

    /**
     * @notice Repay all borrow amount and set min borrow limit to 0.
     * @dev This action usually done when loss is detected in strategy.
     * @dev 0 borrow limit make sure that any future rebalance do not borrow again.
     */
    function repayAll() external onlyKeeper {
        _repay(borrowCToken.borrowBalanceCurrent(address(this)), true);
        minBorrowLimit = 0;
    }

    /**
     * @notice Calculate total value based on COMP claimed, supply and borrow position
     * @dev Report total value in collateral token
     * @dev Claimed COMP will stay in strategy until next rebalance
     */
    function totalValueCurrent() external override returns (uint256 _totalValue) {
        _claimComp();
        supplyCToken.exchangeRateCurrent();
        borrowCToken.exchangeRateCurrent();
        _totalValue = _calculateTotalValue(IERC20(COMP).balanceOf(address(this)));
    }

    /**
     * @notice Calculate and return borrow ratio range.
     * @dev It is calculated as collateralFactor * borrowLimit
     */
    function borrowRatioRange() external view returns (uint256 _minBorrowRatio, uint256 _maxBorrowRatio) {
        (, uint256 _collateralFactorMantissa, ) = COMPTROLLER.markets(address(supplyCToken));
        _minBorrowRatio = (minBorrowLimit * _collateralFactorMantissa) / 1e18;
        _maxBorrowRatio = (maxBorrowLimit * _collateralFactorMantissa) / 1e18;
    }

    /**
     * @notice Current borrow ratio, calculated as current borrow divide by current supply as borrow
     * Return value is based on basis points, i.e. 7500 = 75% ratio
     */
    function currentBorrowRatio() external view returns (uint256) {
        uint256 _cTokenAmount = supplyCToken.balanceOf(address(this));
        uint256 _supply = (_cTokenAmount * supplyCToken.exchangeRateStored()) / 1e18;
        uint256 _currentBorrow = borrowCToken.borrowBalanceStored(address(this));
        if (_currentBorrow == 0) {
            return 0;
        }
        (, uint256 _maxBorrow, ) = swapManager.bestOutputFixedInput(address(collateralToken), borrowToken, _supply);
        return _maxBorrow == 0 ? 0 : (_currentBorrow * MAX_BPS) / _maxBorrow;
    }

    /**
     * @notice Calculate total value using COMP accrued, supply and borrow position
     * @dev Compound calculate COMP accrued and store it when user interact with
     * Compound contracts, i.e. deposit, withdraw or transfer tokens.
     * So compAccrued() will return stored COMP accrued amount, which is older
     * @dev For up to date value check totalValueCurrent()
     */
    function totalValue() public view virtual override returns (uint256 _totalValue) {
        _totalValue = _calculateTotalValue(COMPTROLLER.compAccrued(address(this)));
    }

    /**
     * @notice Calculate current position using claimed COMP and current borrow.
     */
    function isLossMaking() external returns (bool) {
        _claimComp();
        uint256 _compAccrued = IERC20(COMP).balanceOf(address(this));
        uint256 _borrow = borrowCToken.borrowBalanceCurrent(address(this));
        uint256 _borrowBalanceHere = IERC20(borrowToken).balanceOf(address(this));
        // If we are short on borrow amount then check if we can pay interest using accrued COMP
        if (_borrow > _borrowBalanceHere) {
            (, uint256 _compNeededForRepay, ) =
                swapManager.bestInputFixedOutput(COMP, borrowToken, _borrow - _borrowBalanceHere);
            // Accrued COMP are not enough to pay interest on borrow
            if (_compNeededForRepay > _compAccrued) {
                return true;
            }
        }
        return false;
    }

    function isReservedToken(address _token) public view virtual override returns (bool) {
        return
            _token == address(supplyCToken) ||
            _token == COMP ||
            _token == address(collateralToken) ||
            _token == borrowToken;
    }

    /// @notice Approve all required tokens
    function _approveToken(uint256 _amount) internal virtual override {
        collateralToken.safeApprove(pool, _amount);
        collateralToken.safeApprove(address(supplyCToken), _amount);
        IERC20(borrowToken).safeApprove(address(borrowCToken), _amount);
        for (uint256 i = 0; i < swapManager.N_DEX(); i++) {
            IERC20(COMP).safeApprove(address(swapManager.ROUTERS(i)), _amount);
            collateralToken.safeApprove(address(swapManager.ROUTERS(i)), _amount);
            IERC20(borrowToken).safeApprove(address(swapManager.ROUTERS(i)), _amount);
        }
    }

    /**
     * @notice Claim COMP and transfer to new strategy
     * @param _newStrategy Address of new strategy.
     */
    function _beforeMigration(address _newStrategy) internal virtual override {
        require(IStrategy(_newStrategy).token() == address(supplyCToken), "wrong-receipt-token");
        _repay(borrowCToken.borrowBalanceCurrent(address(this)), true);
    }

    /**
     * @notice Calculate borrow position based on current supply, borrow, amount being deposited or
     * withdraw and borrow limits.
     * @param _amount Collateral amount
     * @param _isDeposit Flag indicating whether we are depositing _amount or withdrawing
     * @return _position Amount of borrow that need to be adjusted
     * @return _shouldRepay Flag indicating whether _position is borrow amount or repay amount
     */
    function _calculateBorrowPosition(uint256 _amount, bool _isDeposit)
        internal
        returns (uint256 _position, bool _shouldRepay)
    {
        uint256 _currentBorrow = borrowCToken.borrowBalanceCurrent(address(this));
        // If minimum borrow limit set to 0 then repay borrow
        if (minBorrowLimit == 0) {
            return (_currentBorrow, true);
        }

        uint256 _supply = supplyCToken.balanceOfUnderlying(address(this));
        (, uint256 _collateralFactorMantissa, ) = COMPTROLLER.markets(address(supplyCToken));

        // In case of withdraw, _amount can be greater than _supply
        uint256 _newSupply = _isDeposit ? _supply + _amount : _supply > _amount ? _supply - _amount : 0;

        // Calculate max borrow based on supply and market rate
        uint256 _maxBorrowAsCollateral = (_newSupply * _collateralFactorMantissa) / 1e18;
        (, uint256 _maxBorrow, ) =
            swapManager.bestOutputFixedInput(address(collateralToken), borrowToken, _maxBorrowAsCollateral);
        // If maxBorrow is zero, we should repay total amount of borrow
        if (_maxBorrow == 0) {
            return (_currentBorrow, true);
        }

        uint256 _borrowUpperBound = (_maxBorrow * maxBorrowLimit) / MAX_BPS;
        uint256 _borrowLowerBound = (_maxBorrow * minBorrowLimit) / MAX_BPS;

        // If our current borrow is greater than max borrow allowed, then we will have to repay
        // some to achieve safe position else borrow more.
        if (_currentBorrow > _borrowUpperBound) {
            _shouldRepay = true;
            // If borrow > upperBound then it is greater than lowerBound too.
            _position = _currentBorrow - _borrowLowerBound;
        } else if (_currentBorrow < _borrowLowerBound) {
            _shouldRepay = false;
            // We can borrow more.
            _position = _borrowLowerBound - _currentBorrow;
        }
    }

    /**
     * @dev COMP is converted to collateral and if we have some borrow interest to pay,
     * it will go come from collateral.
     * @dev Report total value in collateral token
     */
    function _calculateTotalValue(uint256 _compAccrued) internal view returns (uint256 _totalValue) {
        uint256 _compAsCollateral;
        if (_compAccrued != 0) {
            (, _compAsCollateral, ) = swapManager.bestOutputFixedInput(COMP, address(collateralToken), _compAccrued);
        }
        uint256 _collateralInCompound =
            (supplyCToken.balanceOf(address(this)) * supplyCToken.exchangeRateStored()) / 1e18;

        uint256 _borrowBalanceHere = IERC20(borrowToken).balanceOf(address(this));
        uint256 _borrowInCompound = borrowCToken.borrowBalanceStored(address(this));

        uint256 _collateralNeededForRepay;
        if (_borrowInCompound > _borrowBalanceHere) {
            (, _collateralNeededForRepay, ) = swapManager.bestInputFixedOutput(
                address(collateralToken),
                borrowToken,
                _borrowInCompound - _borrowBalanceHere
            );
        }
        _totalValue =
            _compAsCollateral +
            _collateralInCompound +
            collateralToken.balanceOf(address(this)) -
            _collateralNeededForRepay;
    }

    /// @notice Claim comp
    function _claimComp() internal {
        address[] memory _markets = new address[](2);
        _markets[0] = address(supplyCToken);
        _markets[1] = address(borrowCToken);
        COMPTROLLER.claimComp(address(this), _markets);
    }

    /// @notice Claim COMP and convert COMP into collateral token.
    function _claimRewardsAndConvertTo(address _toToken) internal override {
        _claimComp();
        uint256 _compAmount = IERC20(COMP).balanceOf(address(this));
        if (_compAmount != 0) {
            _safeSwap(COMP, _toToken, _compAmount);
        }
    }

    /**
     * @notice Generate report for pools accounting and also send profit and any payback to pool.
     * @dev Claim COMP and first convert COMP to borrowToken to cover interest, if any, on borrowed amount.
     * Convert remaining COMP to collateral.
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

        // Claim any comp we have.
        _claimComp();

        uint256 _borrow = borrowCToken.borrowBalanceCurrent(address(this));
        uint256 _borrowBalanceHere = IERC20(borrowToken).balanceOf(address(this));
        // _borrow increases every block. There can be a scenario when COMP are not
        // enough to cover interest diff for borrow, reinvest function will handle
        // collateral liquidation
        if (_borrow > _borrowBalanceHere) {
            _swapToBorrowToken(COMP, _borrow - _borrowBalanceHere);
            // Read borrow balance again as we just swap some COMP to borrow token
            _borrowBalanceHere = IERC20(borrowToken).balanceOf(address(this));
        }

        uint256 _compRemaining = IERC20(COMP).balanceOf(address(this));
        if (_compRemaining != 0) {
            _safeSwap(COMP, address(collateralToken), _compRemaining);
        }

        // Any collateral here is profit
        _profit = collateralToken.balanceOf(address(this));
        uint256 _collateralInCompound = supplyCToken.balanceOfUnderlying(address(this));
        uint256 _profitToWithdraw;

        if (_collateralInCompound > _totalDebt) {
            _profitToWithdraw = _collateralInCompound - _totalDebt;
            _profit += _profitToWithdraw;
        } else {
            _loss = _totalDebt - _collateralInCompound;
        }

        uint256 _totalAmountToWithdraw = _excessDebt + _profitToWithdraw;
        if (_totalAmountToWithdraw != 0) {
            uint256 _withdrawn = _withdrawHere(_totalAmountToWithdraw);
            // Any amount withdrawn over _profitToWithdraw is payback for pool
            if (_withdrawn > _profitToWithdraw) {
                _payback = _withdrawn - _profitToWithdraw;
            }
        }
    }

    /// @notice Deposit collateral in Compound and adjust borrow position
    function _reinvest() internal virtual override {
        uint256 _collateralBalance = collateralToken.balanceOf(address(this));

        (uint256 _borrowAmount, bool _shouldRepay) = _calculateBorrowPosition(_collateralBalance, true);
        if (_shouldRepay) {
            // Repay _borrowAmount to maintain safe position
            _repay(_borrowAmount, false);
            _mintX(collateralToken.balanceOf(address(this)));
        } else {
            // Happy path, mint more borrow more
            _mintX(_collateralBalance);
            _borrowY(_borrowAmount);
        }
    }

    /**
     * @notice Repay borrow amount
     * @dev Claim COMP and convert to collateral. Swap collateral to borrowToken as needed.
     * @param _repayAmount BorrowToken amount that we should repay to maintain safe position.
     * @param _shouldClaimComp Flag indicating should we claim COMP and convert to collateral or not.
     */
    function _repay(uint256 _repayAmount, bool _shouldClaimComp) internal {
        if (_repayAmount != 0) {
            uint256 _borrowBalanceHere = IERC20(borrowToken).balanceOf(address(this));
            // Liability is more than what we have.
            // To repay loan - convert all rewards to collateral, if asked, and redeem collateral(if needed).
            // This scenario is rare and if system works okay it will/might happen during final repay only.
            if (_repayAmount > _borrowBalanceHere) {
                if (_shouldClaimComp) {
                    // Claim COMP and convert those to collateral.
                    _claimRewardsAndConvertTo(address(collateralToken));
                }

                uint256 _currentBorrow = borrowCToken.borrowBalanceCurrent(address(this));
                // For example this is final repay and 100 blocks has passed since last withdraw/rebalance,
                // _currentBorrow is increasing due to interest. Now if _repayAmount > _borrowBalanceHere is true
                // _currentBorrow > _borrowBalanceHere is also true.
                // To maintain safe position we always try to keep _currentBorrow = _borrowBalanceHere

                // Swap collateral to borrowToken to repay borrow and also maintain safe position
                // Here borrowToken amount needed is (_currentBorrow - _borrowBalanceHere)
                _swapToBorrowToken(address(collateralToken), _currentBorrow - _borrowBalanceHere);
            }
            _repayY(_repayAmount);
        }
    }

    /**
     * @notice Swap given token to borrowToken
     * @param _from From token, token which will be swapped with borrowToken
     * @param _shortOnBorrow Expected output of this swap
     */
    function _swapToBorrowToken(address _from, uint256 _shortOnBorrow) internal {
        // Looking for _amountIn using fixed output amount
        (address[] memory _path, uint256 _amountIn, uint256 _rIdx) =
            swapManager.bestInputFixedOutput(_from, borrowToken, _shortOnBorrow);
        if (_amountIn != 0) {
            uint256 _fromBalanceHere = IERC20(_from).balanceOf(address(this));
            // If we do not have enough _from token to get expected output, either get
            // some _from token or adjust expected output.
            if (_amountIn > _fromBalanceHere) {
                if (_from == address(collateralToken)) {
                    // Redeem some collateral, so that we have enough collateral to get expected output
                    _redeemX(_amountIn - _fromBalanceHere);
                } else {
                    _amountIn = _fromBalanceHere;
                    // Adjust expected output based on _from token balance we have.
                    _shortOnBorrow = swapManager.safeGetAmountsOut(_amountIn, _path, _rIdx)[_path.length - 1];
                }
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
        (uint256 _repayAmount, bool _shouldRepay) = _calculateBorrowPosition(_amount, false);
        if (_shouldRepay) {
            _repay(_repayAmount, true);
        }
        uint256 _collateralBefore = collateralToken.balanceOf(address(this));
        _redeemX(_amount);
        uint256 _collateralAfter = collateralToken.balanceOf(address(this));

        return _collateralAfter - _collateralBefore;
    }

    function _getBorrowToken(address _cToken) private view returns (address) {
        // If cETH
        if (_cToken == 0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5) {
            return WETH;
        }
        return CToken(_cToken).underlying();
    }

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

    //////////////////// Compound wrapper functions //////////////////////////////
    /**
     * @dev Compound support ETH as collateral not WETH. So ETH strategy can override
     * _mintX and _redeemX functions and handle wrap/unwrap of WETH.
     */
    function _mintX(uint256 _amount) internal virtual {
        if (_amount != 0) {
            require(supplyCToken.mint(_amount) == 0, "supply-to-compound-failed");
        }
    }

    function _redeemX(uint256 _amount) internal virtual {
        require(supplyCToken.redeemUnderlying(_amount) == 0, "withdraw-from-compound-failed");
    }

    /// @dev BorrowToken can be updated at run time and if it is WETH then wrap borrowed ETH into WETH
    function _borrowY(uint256 _amount) internal {
        if (_amount != 0) {
            require(borrowCToken.borrow(_amount) == 0, "borrow-from-compound-failed");
            if (borrowToken == WETH) {
                TokenLike(WETH).deposit{value: address(this).balance}();
            }
        }
    }

    /// @dev BorrowToken can be updated at run time and if it is WETH then unwrap WETH as ETH before repay
    function _repayY(uint256 _amount) internal {
        if (borrowToken == WETH) {
            TokenLike(WETH).withdraw(_amount);
            borrowCToken.repayBorrow{value: _amount}();
        } else {
            require(borrowCToken.repayBorrow(_amount) == 0, "repay-to-compound-failed");
        }
    }

    //////////////////////////////////////////////////////////////////////////////

    /* solhint-disable no-empty-blocks */

    // We overridden _generateReport which eliminates need of below function.
    function _liquidate(uint256 _excessDebt) internal override returns (uint256 _payback) {}

    function _realizeProfit(uint256 _totalDebt) internal virtual override returns (uint256) {}

    function _realizeLoss(uint256 _totalDebt) internal view override returns (uint256 _loss) {}

    /* solhint-enable no-empty-blocks */
}
