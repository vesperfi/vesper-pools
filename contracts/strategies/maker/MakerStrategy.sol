// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "../Strategy.sol";
import "../../interfaces/vesper/ICollateralManager.sol";
import "../../interfaces/uniswap/IUniswapV2Router02.sol";

interface ManagerInterface {
    function vat() external view returns (address);

    function open(bytes32, address) external returns (uint256);

    function cdpAllow(
        uint256,
        address,
        uint256
    ) external;
}

interface VatInterface {
    function hope(address) external;

    function nope(address) external;
}

/// @dev This strategy will deposit collateral token in Maker, borrow Dai and
/// deposit borrowed DAI in other lending pool to earn interest.
abstract contract MakerStrategy is Strategy {
    using SafeERC20 for IERC20;

    address internal constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    ICollateralManager public immutable cm;
    bytes32 public immutable collateralType;
    uint256 public immutable vaultNum;
    uint256 public lastRebalanceBlock;
    uint256 public highWater;
    uint256 public lowWater;
    uint256 private constant WAT = 10**16;

    constructor(
        address _pool,
        address _cm,
        address _receiptToken,
        bytes32 _collateralType
    ) Strategy(_pool, _receiptToken) {
        collateralType = _collateralType;
        vaultNum = _createVault(_collateralType, _cm);
        cm = ICollateralManager(_cm);
    }

    /**
     * @dev Called during withdrawal process.
     * Withdraw is not allowed if pool in underwater.
     * If pool is underwater, calling resurface() will bring pool above water.
     * It will impact share price in pool and that's why it has to be called before withdraw.
     */
    function beforeWithdraw() external override onlyPool {
        if (isUnderwater()) {
            _resurface();
        }
    }

    /**
     * @dev Rebalance earning and withdraw all collateral.
     */
    function withdrawAllWithEarn() external onlyGovernor {
        _realizeProfit();
        _withdrawAll();
    }

    /**
     * @dev If pool is underwater this function will resolve underwater condition.
     * If Debt in Maker is greater than Dai balance in lender then pool is underwater.
     * Lowering DAI debt in Maker will resolve underwater condtion.
     * Resolve: Calculate required collateral token to lower DAI debt. Withdraw required
     * collateral token from Maker and convert those to DAI via Uniswap.
     * Finally payback debt in Maker using DAI.
     * @dev Also report loss in pool.
     */
    function resurface() external onlyGuardians {
        _resurface();
    }

    /**
     * @notice Update balancing factors aka high water and low water values.
     * Water mark values represent Collateral Ratio in Maker. For example 300 as high water
     * means 300% collateral ratio.
     * @param _highWater Value for high water mark.
     * @param _lowWater Value for low water mark.
     */
    function updateBalancingFactor(uint256 _highWater, uint256 _lowWater) external onlyGovernor {
        require(_lowWater != 0, "lowWater-is-zero");
        require(_highWater > _lowWater, "highWater-less-than-lowWater");
        highWater = _highWater * WAT;
        lowWater = _lowWater * WAT;
    }

    /**
     * @notice Returns interest earned since last rebalance.
     * @dev Make sure to return value in collateral token and in order to do that
     * we are using Uniswap to get collateral amount for earned DAI.
     */
    function interestEarned() external view virtual returns (uint256 amountOut) {
        uint256 daiBalance = _getDaiBalance();
        uint256 debt = cm.getVaultDebt(vaultNum);
        if (daiBalance > debt) {
            uint256 daiEarned = daiBalance - debt;
            (, amountOut) = UniMgr.bestPathFixedInput(DAI, address(collateralToken), daiEarned);
        }
    }

    /// @dev Check whether given token is reserved or not. Reserved tokens are not allowed to sweep.
    function isReservedToken(address _token) public view virtual override returns (bool) {
        return _token == receiptToken;
    }

    /**
     * @notice Returns true if pool is underwater.
     * @notice Underwater - If debt is greater than earning of pool.
     * @notice Earning - Sum of DAI balance and DAI from accured reward, if any, in lending pool.
     */
    function isUnderwater() public view virtual returns (bool) {
        return cm.getVaultDebt(vaultNum) > _getDaiBalance();
    }

    /// @dev Convert from 18 decimals to token defined decimals. Default no conversion.
    function convertFrom18(uint256 _amount) public pure virtual returns (uint256) {
        return _amount;
    }

    /// @dev Create new Maker vault
    function _createVault(bytes32 _collateralType, address _cm) internal returns (uint256 vaultId) {
        address mcdManager = ICollateralManager(_cm).mcdManager();
        ManagerInterface manager = ManagerInterface(mcdManager);
        vaultId = manager.open(_collateralType, address(this));
        manager.cdpAllow(vaultId, address(this), 1);

        //hope and cpdAllow on vat for collateralManager's address
        VatInterface(manager.vat()).hope(_cm);
        manager.cdpAllow(vaultId, _cm, 1);

        //Register vault with collateral Manager
        ICollateralManager(_cm).registerVault(vaultId, _collateralType);
    }

    function _approveToken(uint256 _amount) internal override {
        IERC20(DAI).safeApprove(address(cm), _amount);
        IERC20(DAI).safeApprove(address(receiptToken), _amount);
        IERC20(DAI).safeApprove(address(UniMgr.ROUTER()), _amount);
        collateralToken.safeApprove(address(cm), _amount);
        collateralToken.safeApprove(pool, _amount);
        collateralToken.safeApprove(address(UniMgr.ROUTER()), _amount);
        _afterApproveToken(_amount);
    }

    function _deposit(uint256 _amount) internal override {
        if (_amount != 0) {
            cm.depositCollateral(vaultNum, _amount);
        }
    }

    function _moveDaiToMaker(uint256 _amount) internal {
        if (_amount != 0) {
            _withdrawDaiFromLender(_amount);
            cm.payback(vaultNum, _amount);
        }
    }

    function _moveDaiFromMaker(uint256 _amount) internal virtual {
        cm.borrow(vaultNum, _amount);
        _amount = IERC20(DAI).balanceOf(address(this));
        _depositDaiToLender(_amount);
    }

    /**
     * @notice Withdraw collateral to payback excess debt in pool.
     * @param _excessDebt Excess debt of strategy in collateral token
     * @return payback amount in collateral token. Usually it is equal to excess debt.
     */
    function _liquidate(uint256 _excessDebt) internal virtual override returns (uint256) {
        _withdrawHere(_excessDebt);
        return _excessDebt;
    }

    /**
     * @notice Calculate earning and convert it to collateral token
     * @dev Also claim rewards if available.
     *      Withdraw excess DAI from lender.
     *      Swap net earned DAI to collateral token
     * @return profit in collateral token
     */
    function _realizeProfit() internal virtual override returns (uint256) {
        _claimReward();
        _rebalanceDaiInLender();
        uint256 _daiBalance = IERC20(DAI).balanceOf(address(this));
        if (_daiBalance != 0) {
            _safeSwap(DAI, address(collateralToken), _daiBalance);
        }
        return collateralToken.balanceOf(address(this));
    }

    /**
     * @notice Deposit collateral in Maker and rebalance collateral and debt in Maker.
     * @dev Based on defined risk parameter either borrow more DAI from Maker or
     * payback some DAI in Maker. It will try to mitigate risk of liquidation.
     */
    function _reinvest() internal virtual override {
        _deposit(collateralToken.balanceOf(address(this)));
        (
            uint256 _collateralLocked,
            uint256 _currentDebt,
            uint256 _collateralUsdRate,
            uint256 _collateralRatio,
            uint256 _minimumAllowedDebt
        ) = cm.getVaultInfo(vaultNum);
        uint256 _maxDebt = (_collateralLocked * _collateralUsdRate) / highWater;
        if (_maxDebt < _minimumAllowedDebt) {
            // Dusting Scenario:: Based on collateral locked, if our max debt is less
            // than Maker defined minimum debt then payback whole debt and wind up.
            _moveDaiToMaker(_currentDebt);
        } else {
            if (_collateralRatio > highWater) {
                require(!isUnderwater(), "pool-is-underwater");
                // Safe to borrow more DAI
                _moveDaiFromMaker(_maxDebt - _currentDebt);
            } else if (_collateralRatio < lowWater) {
                // Being below low water brings risk of liquidation in Maker.
                // Withdraw DAI from Lender and deposit in Maker
                _moveDaiToMaker(_currentDebt - _maxDebt);
            }
        }
    }

    function _resurface() internal virtual {
        uint256 _daiBalance = _getDaiBalance();
        uint256 _daiDebt = cm.getVaultDebt(vaultNum);
        require(_daiDebt > _daiBalance, "pool-is-above-water");
        uint256 _daiNeeded = _daiDebt - _daiBalance;
        (address[] memory _path, uint256 _collateralNeeded) =
            UniMgr.bestPathFixedOutput(address(collateralToken), DAI, _daiNeeded);
        if (_collateralNeeded != 0) {
            cm.withdrawCollateral(vaultNum, _collateralNeeded);
            UniMgr.ROUTER().swapExactTokensForTokens(_collateralNeeded, 1, _path, address(this), block.timestamp + 30);
            cm.payback(vaultNum, IERC20(DAI).balanceOf(address(this)));
            // TODO review this report file. Also need to take decision on realizeLoss function
            // Report loss back to the pool
            IVesperPool(pool).reportEarning(0, _collateralNeeded, 0);
            // After loss report we might get more asset to invest from pool
            if (collateralToken.balanceOf(address(this)) != 0) {
                _reinvest();
            }
        }
    }

    function _withdraw(uint256 _amount) internal override {
        _withdrawHere(_amount);
        collateralToken.safeTransfer(pool, collateralToken.balanceOf(address(this)));
    }

    function _withdrawHere(uint256 _amount) internal {
        (
            uint256 collateralLocked,
            uint256 debt,
            uint256 collateralUsdRate,
            uint256 collateralRatio,
            uint256 minimumDebt
        ) = cm.whatWouldWithdrawDo(vaultNum, _amount);
        if (debt != 0 && collateralRatio < lowWater) {
            // If this withdraw results in Low Water scenario.
            uint256 maxDebt = (collateralLocked * collateralUsdRate) / highWater;
            if (maxDebt < minimumDebt) {
                // This is Dusting scenario
                _moveDaiToMaker(debt);
            } else if (maxDebt < debt) {
                _moveDaiToMaker(debt - maxDebt);
            }
        }
        cm.withdrawCollateral(vaultNum, _amount);
    }

    function _withdrawAll() internal override {
        _moveDaiToMaker(cm.getVaultDebt(vaultNum));
        require(cm.getVaultDebt(vaultNum) == 0, "debt-should-be-0");
        uint256 _collateralLocked = convertFrom18(cm.getVaultBalance(vaultNum));
        cm.withdrawCollateral(vaultNum, _collateralLocked);
        collateralToken.safeTransfer(pool, collateralToken.balanceOf(address(this)));
    }

    /// @dev Not all child contract will need this. So initialized as empty
    //solhint-disable-next-line no-empty-blocks
    function _afterApproveToken(uint256 _amount) internal virtual {}

    function _depositDaiToLender(uint256 _amount) internal virtual;

    function _rebalanceDaiInLender() internal virtual;

    function _withdrawDaiFromLender(uint256 _amount) internal virtual;

    function _getDaiBalance() internal view virtual returns (uint256);
}