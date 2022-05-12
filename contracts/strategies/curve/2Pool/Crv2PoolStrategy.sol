// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../../../dependencies/openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../../dependencies/openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../../interfaces/vesper/IVesperPool.sol";
import "../../Strategy.sol";
import "../CrvPoolStrategyBase.sol";

// solhint-disable no-empty-blocks

/// @title This strategy will deposit collateral token in a Curve 2Pool and earn interest.
abstract contract Crv2PoolStrategy is CrvPoolStrategyBase {
    // No. of pooled tokens in the Pool
    uint256 private constant N = 2;

    constructor(
        address _pool,
        address _swapManager,
        address _crvPool,
        address _crvLp,
        address _crvGauge,
        uint256 _collateralIdx,
        string memory _name
    ) CrvPoolStrategyBase(_pool, _crvPool, _crvLp, _crvGauge, _swapManager, _collateralIdx, N, _name) {}

    function _depositToCurve(uint256 _amt) internal virtual override returns (bool) {
        if (_amt != 0) {
            uint256[2] memory _depositAmounts;
            _depositAmounts[collIdx] = _amt;
            uint256 _expectedOut =
                _calcAmtOutAfterSlippage(
                    IStableSwap2x(address(crvPool)).calc_token_amount(_depositAmounts, true),
                    crvSlippage
                );
            uint256 _minLpAmount =
                _calcAmtOutAfterSlippage(
                    ((_amt * _getSafeUsdRate()) / crvPool.get_virtual_price()) * 10**(18 - coinDecimals[collIdx]),
                    crvSlippage
                );
            if (_expectedOut > _minLpAmount) {
                _minLpAmount = _expectedOut;
            }
            try IStableSwap2x(address(crvPool)).add_liquidity(_depositAmounts, _minLpAmount) {} catch Error(
                string memory reason
            ) {
                emit DepositFailed(reason);
                return false;
            }
        }
        return true;
    }

    function _claimRewards() internal virtual override {
        ITokenMinter(CRV_MINTER).mint(crvGauge);
        ILiquidityGaugeV2(crvGauge).claim_rewards(address(this));
    }
}
