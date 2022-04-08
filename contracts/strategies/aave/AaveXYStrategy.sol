// SPDX-License-Identifier: GNU LGPLv3

pragma solidity 0.8.9;

import "../Strategy.sol";
import "../../interfaces/aave/IAave.sol";
import "../../interfaces/oracle/IUniswapV3Oracle.sol";
import "./AaveCore.sol";
import "../../interfaces/vesper/IPoolRewards.sol";

/// @title Deposit Collateral in Aave and earn interest by depositing borrowed token in a Vesper Pool.
contract AaveXYStrategy is Strategy, AaveCore {
    using SafeERC20 for IERC20;

    // solhint-disable-next-line var-name-mixedcase
    string public NAME;
    string public constant VERSION = "4.0.0";

    uint256 internal constant MAX_BPS = 10_000; //100%
    uint256 public minBorrowRatio = 5_000; // 50%
    uint256 public maxBorrowRatio = 6_000; // 60%

    IUniswapV3Oracle internal constant ORACLE = IUniswapV3Oracle(0x0F1f5A87f99f0918e6C81F16E59F3518698221Ff);
    uint32 internal constant TWAP_PERIOD = 3600;
    address public rewardToken;
    address public borrowToken;
    AToken public vdToken; // Variable Debt Token

    constructor(
        address _pool,
        address _swapManager,
        address _rewardToken,
        address _receiptToken,
        address _borrowToken,
        string memory _name
    ) Strategy(_pool, _swapManager, _receiptToken) AaveCore(_receiptToken) {
        NAME = _name;
        rewardToken = _rewardToken;
        (, , address _vdToken) = aaveProtocolDataProvider.getReserveTokensAddresses(_borrowToken);
        vdToken = AToken(_vdToken);
        borrowToken = _borrowToken;
    }

    /**
     * @notice Current borrow ratio, calculated as current borrow divide by max allowed borrow
     * Return value is based on basis points, i.e. 7500 = 75% ratio
     */
    function currentBorrowRatio() external view returns (uint256) {
        (uint256 _supply, uint256 _borrow) = getPosition();
        return _borrow == 0 ? 0 : (_borrow * MAX_BPS) / _supply;
    }

    /// @notice Return supply and borrow position. Position may return few block old value
    function getPosition() public view returns (uint256 _supply, uint256 _borrow) {
        _supply = _convertCollateralToBorrow(aToken.balanceOf(address(this)));
        _borrow = vdToken.balanceOf(address(this));
    }

    /**
     * @notice Calculate current position using claimed rewardToken and current borrow.
     */
    function isLossMaking() external view returns (bool) {
        // It's loss making if _totalValue < totalDebt
        return totalValue() < IVesperPool(pool).totalDebtOf(address(this));
    }

    function isReservedToken(address _token) public view virtual override returns (bool) {
        return _isReservedToken(_token) || address(vdToken) == _token || borrowToken == _token;
    }

    /**
     * @notice Calculate total value using rewardToken accrued, supply and borrow position
     */
    function totalValue() public view virtual override returns (uint256 _totalValue) {
        uint256 _aaveRewardAccrued = _totalAave();
        uint256 _aaveAsCollateral;
        if (_aaveRewardAccrued > 0) {
            (, _aaveAsCollateral, ) = swapManager.bestOutputFixedInput(
                rewardToken,
                address(collateralToken),
                _aaveRewardAccrued
            );
        }

        uint256 _supply = aToken.balanceOf(address(this));
        uint256 _borrowInAave = vdToken.balanceOf(address(this));
        uint256 _investedBorrowBalance = _getInvestedBorrowBalance();

        uint256 _collateralNeededForRepay;
        if (_borrowInAave > _investedBorrowBalance) {
            (, _collateralNeededForRepay, ) = swapManager.bestInputFixedOutput(
                address(collateralToken),
                borrowToken,
                _borrowInAave - _investedBorrowBalance
            );
        }
        _totalValue =
            _aaveAsCollateral +
            collateralToken.balanceOf(address(this)) +
            _supply -
            _collateralNeededForRepay;
    }

    /// @notice After borrowing Y Hook
    function _afterBorrowY(uint256 _amount) internal virtual {}

    /// @notice Approve all required tokens
    function _approveToken(uint256 _amount) internal virtual override {
        collateralToken.safeApprove(pool, _amount);
        collateralToken.safeApprove(address(aToken), _amount);
        collateralToken.safeApprove(address(aaveLendingPool), _amount);
        IERC20(borrowToken).safeApprove(address(aaveLendingPool), _amount);

        for (uint256 i = 0; i < swapManager.N_DEX(); i++) {
            IERC20(collateralToken).safeApprove(address(swapManager.ROUTERS(i)), _amount);
            IERC20(rewardToken).safeApprove(address(swapManager.ROUTERS(i)), _amount);
            IERC20(borrowToken).safeApprove(address(swapManager.ROUTERS(i)), _amount);
        }
    }

    /**
     * @notice Claim rewardToken and transfer to new strategy
     * @param _newStrategy Address of new strategy.
     */
    function _beforeMigration(address _newStrategy) internal virtual override {
        require(IStrategy(_newStrategy).token() == address(aToken), "wrong-receipt-token");
        _repayY(vdToken.balanceOf(address(this)));
    }

    /// @notice Before repaying Y Hook
    function _beforeRepayY(uint256 _amount) internal virtual returns (uint256 _withdrawnAmount) {
        return _amount;
    }

    function _borrowY(uint256 _amount) internal virtual {
        if (_amount > 0) {
            // 2 for variable rate borrow, 0 for referralCode
            aaveLendingPool.borrow(borrowToken, _amount, 2, 0, address(this));
            _afterBorrowY(_amount);
        }
    }

    /**
     * @notice Calculate borrow position based on borrow ratio, current supply, borrow, amount
     * being deposited or withdrawn.
     * @param _amount Collateral amount
     * @param _isDeposit Flag indicating whether we are depositing _amount or withdrawing
     * @return _position Amount of borrow that need to be adjusted
     * @return _shouldRepay Flag indicating whether _position is borrow amount or repay amount
     */
    function _calculateDesiredPosition(uint256 _amount, bool _isDeposit)
        internal
        view
        returns (uint256 _position, bool _shouldRepay)
    {
        uint256 _supply = aToken.balanceOf(address(this));
        uint256 _totalBorrow = vdToken.balanceOf(address(this));

        // In case of withdraw, _amount can be greater than _supply
        uint256 _newSupply = _isDeposit ? _supply + _amount : _supply > _amount ? _supply - _amount : 0;

        // If minimum borrow limit set to 0 then repay borrow
        if (minBorrowRatio == 0 || _newSupply == 0) {
            return (_totalBorrow, true);
        }

        _newSupply = _convertCollateralToBorrow(_newSupply);

        // (supply * borrowRatio)/(BPS)
        uint256 _borrowUpperBound = (_newSupply * maxBorrowRatio) / MAX_BPS;
        uint256 _borrowLowerBound = (_newSupply * minBorrowRatio) / MAX_BPS;

        // If our current borrow is greater than max borrow allowed, then we will have to repay
        // some to achieve safe position else borrow more.
        if (_totalBorrow > _borrowUpperBound) {
            _shouldRepay = true;
            // If borrow > upperBound then it is greater than lowerBound too.
            _position = _totalBorrow - _borrowLowerBound;
        } else if (_totalBorrow < _borrowLowerBound) {
            _shouldRepay = false;
            // We can borrow more.
            _position = _borrowLowerBound - _totalBorrow;
        }
    }

    function _convertCollateralToBorrow(uint256 _collateralAmount) internal view returns (uint256 _borrowAmount) {
        (, _borrowAmount, ) = swapManager.bestOutputFixedInput(
            address(collateralToken),
            borrowToken,
            _collateralAmount
        );
    }

    /// @notice Claim Aave and VSP rewards and convert to _toToken.
    function _claimRewardsAndConvertTo(address _toToken) internal virtual override {
        uint256 _aaveAmount = _claimAave();
        if (_aaveAmount > 0) {
            _safeSwap(rewardToken, _toToken, _aaveAmount, 1);
        }
    }

    /**
     * @notice Generate report for pools accounting and also send profit and any payback to pool.
     * @dev Claim rewardToken and convert to collateral.
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

        // Claim rewardToken and convert to collateral token
        _claimRewardsAndConvertTo(address(collateralToken));

        uint256 _supply = aToken.balanceOf(address(this));
        uint256 _borrow = vdToken.balanceOf(address(this));

        uint256 _investedBorrowBalance = _getInvestedBorrowBalance();

        if (_investedBorrowBalance > (_borrow + 1e18)) {
            // Swaps excess profit from the underlying vPool
            // For more collateral
            // Keeps 1e18 of Y invested as buffer to deal with dust
            // During last withdraw
            _rebalanceBorrow(_investedBorrowBalance - (_borrow + 1e18));
        } else {
            _swapToBorrowToken(_borrow - _investedBorrowBalance);
        }

        uint256 _collateralHere = collateralToken.balanceOf(address(this));
        uint256 _totalCollateral = _supply + _collateralHere;

        if (_totalCollateral > _totalDebt) {
            _profit = _totalCollateral - _totalDebt;
        } else {
            _loss = _totalDebt - _totalCollateral;
        }
        uint256 _profitAndExcessDebt = _profit + _excessDebt;
        if (_collateralHere < _profitAndExcessDebt) {
            uint256 _totalAmountToWithdraw = Math.min((_profitAndExcessDebt - _collateralHere), _supply);
            if (_totalAmountToWithdraw > 0) {
                _withdrawHere(_totalAmountToWithdraw);
                _collateralHere = collateralToken.balanceOf(address(this));
            }
        }

        if (_excessDebt > 0) {
            _payback = Math.min(_collateralHere, _excessDebt);
        }
    }

    /// @notice Borrowed Y balance deposited here or elsewhere hook
    function _getInvestedBorrowBalance() internal view virtual returns (uint256) {
        return IERC20(borrowToken).balanceOf(address(this));
    }

    // @solhint-disable-next-line no-empty-blocks
    function _liquidate(uint256 _excessDebt) internal override returns (uint256 _payback) {}

    /**
     * @dev Aave support WETH as collateral.
     */
    function _mint(uint256 _amount) internal virtual {
        _deposit(address(collateralToken), _amount);
    }

    // @solhint-disable-next-line no-empty-blocks
    function _realizeLoss(uint256 _totalDebt) internal view override returns (uint256 _loss) {}

    // @solhint-disable-next-line no-empty-blocks
    function _realizeProfit(uint256 _totalDebt) internal virtual override returns (uint256) {}

    /// @notice Swap excess borrow for more collateral hook
    function _rebalanceBorrow(uint256 _excessBorrow) internal virtual {}

    function _redeemX(uint256 _amount) internal virtual {
        _withdraw(address(collateralToken), address(this), _amount);
    }

    /// @notice Deposit collateral in Aave and adjust borrow position
    function _reinvest() internal virtual override {
        uint256 _collateralBalance = collateralToken.balanceOf(address(this));

        (uint256 _borrowAmount, bool _shouldRepay) = _calculateDesiredPosition(_collateralBalance, true);

        if (_shouldRepay) {
            // Repay _borrowAmount to maintain safe position
            _repayY(_borrowAmount);
            _mint(collateralToken.balanceOf(address(this)));
        } else {
            // Happy path, mint more borrow more
            _mint(_collateralBalance);
            _borrowY(_borrowAmount);
        }
    }

    function _repayY(uint256 _amount) internal virtual {
        uint256 _repayAmount = _beforeRepayY(_amount);
        if (_repayAmount > 0) aaveLendingPool.repay(borrowToken, _repayAmount, 2, address(this));
    }

    /**
     * @dev If swap slippage is defined then use oracle to get amountOut and calculate minAmountOut
     */
    function _safeSwap(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn
    ) internal virtual {
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
     * @notice Swap given token to borrowToken
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
        (uint256 _position, bool _shouldRepay) = _calculateDesiredPosition(_amount, false);
        if (_shouldRepay) {
            _repayY(_position);
        }
        uint256 _collateralBefore = collateralToken.balanceOf(address(this));

        _redeemX(_amount);

        return collateralToken.balanceOf(address(this)) - _collateralBefore;
    }

    /**
     * @notice Update upper, lower borrow  and slippage.
     * @dev It is possible to set 0 as _minBorrowRatio to not borrow anything
     * @param _minBorrowRatio Minimum % we want to borrow
     * @param _maxBorrowRatio Maximum % we want to borrow
     */
    function updateBorrowRatio(uint256 _minBorrowRatio, uint256 _maxBorrowRatio) external onlyGovernor {
        (, uint256 _collateralFactor, , , , , , , , ) =
            aaveProtocolDataProvider.getReserveConfigurationData(address(collateralToken));
        require(_maxBorrowRatio < _collateralFactor, "invalid-max-borrow-limit");
        require(_maxBorrowRatio > _minBorrowRatio, "max-should-be-higher-than-min");
        minBorrowRatio = _minBorrowRatio;
        maxBorrowRatio = _maxBorrowRatio;
    }
}
