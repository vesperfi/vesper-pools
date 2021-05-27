// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface AaveAddressesProvider {
    function getLendingPool() external view returns (address);

    function getLendingPoolCore() external view returns (address);
}

interface AavePool {
    function deposit(
        address _reserve,
        uint256 _amount,
        uint16 _referralCode
    ) external payable;
}

interface AavePoolCore {
    function getReserveATokenAddress(address _reserve) external view returns (address);

    function getReserveAvailableLiquidity(address _reserve) external view returns (uint256);
}

interface AToken is IERC20 {
    function redeem(uint256 _amount) external;

    function principalBalanceOf(address _user) external view returns (uint256);
}
