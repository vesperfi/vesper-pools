// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "../CompoundStrategy.sol";
import "../../VFR.sol";

// solhint-disable no-empty-blocks
abstract contract CompoundCoverageStrategy is CompoundStrategy, VFR {
    constructor(
        address _pool,
        address _swapManager,
        address _receiptToken
    ) CompoundStrategy(_pool, _swapManager, _receiptToken) {}

    function _realizeProfit(uint256 _totalDebt) internal override returns (uint256 _profit) {
        _profit = _handleCoverageProfit(pool, super._realizeProfit(_totalDebt));
    }
}
