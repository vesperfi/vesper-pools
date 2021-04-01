// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/utils/Context.sol";

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (governor) that can be granted exclusive access to
 * specific functions.
 *
 * By default, the governor account will be the one that deploys the contract. This
 * can later be changed with {transferGovernorship}.
 *
 */
contract Governed is Context {
    address public governor;
    address private newGovernor;

    event UpdatedGovernor(address indexed previousGovernor, address indexed newGovernor);

    /**
     * @dev Initializes the contract setting the deployer as the initial governor.
     */
    constructor() {
        address msgSender = _msgSender();
        governor = msgSender;
        emit UpdatedGovernor(address(0), msgSender);
    }

    /**
     * @dev Throws if called by any account other than the governor.
     */
    modifier onlyGovernor {
        require(governor == _msgSender(), "caller-is-not-the-governor");
        _;
    }

    /**
     * @dev Transfers governorship of the contract to a new account (`newGovernor`).
     * Can only be called by the current owner.
     */
    function transferGovernorship(address _newGovernor) external onlyGovernor {
        require(_newGovernor != address(0), "new-governor-is-zero-address");
        newGovernor = _newGovernor;
    }

    /**
     * @dev Allows new governor to accept governorship of the contract.
     */
    function acceptGovernorship() external {
        require(msg.sender == newGovernor, "caller-is-not-the-new-governor");
        emit UpdatedGovernor(governor, newGovernor);
        governor = newGovernor;
        newGovernor = address(0);
    }
}
