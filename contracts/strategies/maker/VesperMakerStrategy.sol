// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./MakerStrategy.sol";

/// @dev This strategy will deposit collateral token in Maker, borrow Dai and
/// deposit borrowed DAI in Vesper DAI pool to earn interest.
abstract contract VesperMakerStrategy is MakerStrategy {
    using SafeERC20 for IERC20;

    constructor(
        address _pool,
        address _cm,
        address _swapManager,
        address _vPool,
        bytes32 _collateralType
    ) MakerStrategy(_pool, _cm, _swapManager, _vPool, _collateralType) {
        require(IVesperPool(_vPool).token() == DAI, "not-a-valid-dai-pool");
    }

    function _approveToken(uint256 _amount) internal override {
        super._approveToken(_amount);
        IERC20(DAI).safeApprove(address(receiptToken), _amount);
    }

    function _getDaiBalance() internal view override returns (uint256) {
        return (IVesperPool(receiptToken).pricePerShare() * IVesperPool(receiptToken).balanceOf(address(this))) / 1e18;
    }

    function _depositDaiToLender(uint256 _amount) internal override {
        IVesperPool(receiptToken).deposit(_amount);
    }

    function _withdrawDaiFromLender(uint256 _amount) internal override {
        uint256 _vAmount = (_amount * 1e18) / IVesperPool(receiptToken).pricePerShare();
        IVesperPool(receiptToken).withdrawByStrategy(_vAmount);
    }

    function _rebalanceDaiInLender() internal override {
        uint256 _daiDebt = cm.getVaultDebt(address(this));
        uint256 _daiBalance = _getDaiBalance();
        if (_daiBalance > _daiDebt) {
            _withdrawDaiFromLender(_daiBalance - _daiDebt);
        }
    }
}
