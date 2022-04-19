// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./CompoundXYCore.sol";

// solhint-disable no-empty-blocks
/// @title This strategy will deposit collateral token in IronBank and based on position
/// it will borrow another token. Supply X borrow Y and keep borrowed amount here.
contract IronBankXYStrategy is CompoundXYCore {
    constructor(
        address _pool,
        address _swapManager,
        address _unitroller,
        address _receiptToken,
        address _borrowCToken,
        string memory _name
    ) CompoundXYCore(_pool, _swapManager, _unitroller, _receiptToken, _borrowCToken, _name) {}
}
