// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./VPoolBase.sol";

//solhint-disable no-empty-blocks
contract VFRPool is VPoolBase {
    string public constant VERSION = "3.0.4";

    uint256 public vfrTargetAPY;
    uint256 public vfrStartTime;
    uint256 public vfrInitialPricePerShare;

    constructor(
        string memory _name,
        string memory _symbol,
        address _token
    ) VPoolBase(_name, _symbol, _token) {}

    function initialize(
        string memory _name,
        string memory _symbol,
        address _token,
        address _poolAccountant,
        address _addressListFactory
    ) public initializer {
        _initializeBase(_name, _symbol, _token, _poolAccountant, _addressListFactory);
    }

    function startVFR(uint256 _apy) external onlyGovernor {
        vfrTargetAPY = _apy;
        vfrStartTime = block.timestamp;
        vfrInitialPricePerShare = pricePerShare();
    }

    function targetPricePerShare() external view returns (uint256) {
        return
            vfrInitialPricePerShare +
            (vfrInitialPricePerShare * vfrTargetAPY * (block.timestamp - vfrStartTime)) /
            (MAX_BPS * 365 * 24 * 3600);
    }

    function targetPricePerShareForAPY(uint256 _apy) external view returns (uint256) {
        return
            vfrInitialPricePerShare +
            (vfrInitialPricePerShare * _apy * (block.timestamp - vfrStartTime)) /
            (MAX_BPS * 365 * 24 * 3600);
    }

    function amountForPriceIncrease(uint256 _fromPricePerShare, uint256 _toPricePerShare)
        public
        view
        returns (uint256)
    {
        uint256 _fromTotalValue = (_fromPricePerShare * totalSupply()) / 1e18;
        uint256 _toTotalValue = (_toPricePerShare * totalSupply()) / 1e18;
        return _toTotalValue > _fromTotalValue ? _toTotalValue - _fromTotalValue : 0;
    }
}
