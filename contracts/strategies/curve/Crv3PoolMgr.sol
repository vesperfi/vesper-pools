// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "./CrvPoolMgrBase.sol";
import "../../interfaces/curve/IStableSwap3Pool.sol";
import "../../interfaces/chainlink/IAggregatorV3.sol";

contract Crv3PoolMgr is CrvPoolMgrBase {
    IStableSwap3Pool public constant THREEPOOL = IStableSwap3Pool(0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7);
    address public constant THREECRV = 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;
    address public constant GAUGE = 0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A;

    /* solhint-disable var-name-mixedcase */
    string[3] public COINS = ["DAI", "USDC", "USDT"];

    address[3] public COIN_ADDRS = [
        0x6B175474E89094C44Da98b954EedeAC495271d0F, // DAI
        0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48, // USDC
        0xdAC17F958D2ee523a2206206994597C13D831ec7 // USDT
    ];
    address[3] public PRICE_FEEDS = [
        0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9, // DAI-USD
        0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6, // USDC-USD
        0x3E7d1eAB13ad0104d2750B8863b489D65364e32D // USDT-USD
    ];

    /* solhint-enable */

    // solhint-disable-next-line no-empty-blocks
    constructor() CrvPoolMgrBase(address(THREEPOOL), THREECRV, GAUGE) {}

    function getExternalPrice(uint256 i) public view returns (int256 price, uint8 decimals) {
        IAggregatorV3 priceFeed = IAggregatorV3(PRICE_FEEDS[i]);
        // There's other data here we may want to use to validate the oracle (timestamp esp.)
        (, price, , , ) = priceFeed.latestRoundData();
        // Note, these are all 8 for the three contracts we're getting, so we could skip this call
        decimals = 8;
    }

    function getMinExternalPrice() public view returns (int256 price, uint8 decimals) {
        for (uint256 i = 0; i < COINS.length; i++) {
            (int256 tp, uint8 td) = getExternalPrice(i);
            if ((price == 0) || (tp < price)) {
                price = tp;
                decimals = td;
            }
        }
        require(price != 0, "Unsafe - no price from oracle");
    }

    function getAllExternalPrices() public view returns (int256[3] memory prices, uint8[3] memory decimals) {
        for (uint256 i = 0; i < COINS.length; i++) {
            (prices[i], decimals[i]) = getExternalPrice(i);
        }
    }

    function minimumLpPrice() public view returns (uint256) {
        (int256 minPrice, uint8 minDec) = getMinExternalPrice();
        return (THREEPOOL.get_virtual_price() * uint256(minPrice)) / (10**uint256(minDec));
    }

    function get3PoolBalances(uint256 _lpAmount) public view returns (uint256[3] memory balances) {
        // the balance of a given coin is equal to our share of the lp supply,
        // times the underlying balance, less the pool withdrawal fee
        for (uint256 i = 0; i < COINS.length; i++) {
            balances[i] =
                (((THREEPOOL.balances(i) * _lpAmount) / (IERC20(crvLp).totalSupply())) *
                    (uint256(1e10) - THREEPOOL.fee())) /
                uint256(1e10);
        }
    }

    function _depositToCrvPool(
        uint256 _daiAmount,
        uint256 _usdcAmount,
        uint256 _usdtAmount
    ) internal {
        uint256[3] memory depositAmounts = [_daiAmount, _usdcAmount, _usdtAmount];
        // using 1 for min_mint_amount, but we may want to improve this logic
        THREEPOOL.add_liquidity(depositAmounts, 1);
    }

    function _withdrawAsFromCrvPool(
        uint256 _lpAmount,
        uint256 _minAmt,
        uint256 i
    ) internal {
        THREEPOOL.remove_liquidity_one_coin(_lpAmount, SafeCast.toInt128(int256(i)), _minAmt);
    }

    function _withdrawAllAs(uint256 i) internal {
        uint256 lpAmt = IERC20(crvLp).balanceOf(address(this));
        if (lpAmt != 0) {
            THREEPOOL.remove_liquidity_one_coin(lpAmt, SafeCast.toInt128(int256(i)), 0);
        }
    }

    function calcWithdrawLpAs(uint256 _amtNeeded, uint256 i)
        public
        view
        returns (uint256 lpToWithdraw, uint256 unstakeAmt)
    {
        uint256 lp = IERC20(crvLp).balanceOf(address(this));
        uint256 tlp = lp + IERC20(crvGauge).balanceOf(address(this));
        lpToWithdraw = (_amtNeeded * tlp) / getLpValueAs(tlp, i);
        lpToWithdraw = (lpToWithdraw > tlp) ? tlp : lpToWithdraw;
        if (lpToWithdraw > lp) {
            unstakeAmt = lpToWithdraw - lp;
        }
    }

    function getLpValueAs(uint256 _lpAmount, uint256 i) public view returns (uint256) {
        return (_lpAmount != 0) ? THREEPOOL.calc_withdraw_one_coin(_lpAmount, SafeCast.toInt128(int256(i))) : 0;
    }

    function estimateFeeImpact(uint256 _amount) public view returns (uint256) {
        return (_amount * (uint256(1e10) - estimatedFees())) / (uint256(1e10));
    }

    function estimatedFees() public view returns (uint256) {
        return THREEPOOL.fee() * 3;
    }
}