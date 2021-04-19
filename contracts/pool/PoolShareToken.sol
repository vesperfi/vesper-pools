// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../Governed.sol";
import "../Pausable.sol";
import "../interfaces/vesper/IVesperPool.sol";
import "../interfaces/vesper/IPoolRewards.sol";
import "../interfaces/bloq/IAddressList.sol";
import "../interfaces/bloq/IAddressListFactory.sol";

/// @title Holding pool share token
// solhint-disable no-empty-blocks
abstract contract PoolShareToken is ERC20, Pausable, ReentrancyGuard, Governed {
    using SafeERC20 for IERC20;
    IERC20 public immutable token;
    IAddressList public immutable feeWhiteList;
    address public poolRewards;
    uint256 public constant MAX_BPS = 10000;
    address public feeCollector; // fee collector address
    uint256 public withdrawFee; // withdraw fee for this pool

    /// @dev The EIP-712 typehash for the contract's domain
    bytes32 public constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    /// @dev The EIP-712 typehash for the permit struct used by the contract
    bytes32 public constant PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    bytes32 public immutable domainSeparator;

    mapping(address => uint256) public nonces;
    event Deposit(address indexed owner, uint256 shares, uint256 amount);
    event Withdraw(address indexed owner, uint256 shares, uint256 amount);
    event UpdatedFeeCollector(address indexed previousFeeCollector, address indexed newFeeCollector);
    event UpdatedPoolRewards(address indexed previousPoolRewards, address indexed newPoolRewards);
    event UpdatedWithdrawFee(uint256 previousWithdrawFee, uint256 newWithdrawFee);

    constructor(
        string memory _name,
        string memory _symbol,
        address _token
    ) ERC20(_name, _symbol) {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        token = IERC20(_token);
        IAddressListFactory factory = IAddressListFactory(0xded8217De022706A191eE7Ee0Dc9df1185Fb5dA3);
        IAddressList _feeWhiteList = IAddressList(factory.createList());
        feeWhiteList = _feeWhiteList;
        domainSeparator = keccak256(
            abi.encode(DOMAIN_TYPEHASH, keccak256(bytes(_name)), keccak256(bytes("1")), chainId, address(this))
        );
    }

    /**
     * @notice Update fee collector address for this pool
     * @param _newFeeCollector new fee collector address
     */
    function updateFeeCollector(address _newFeeCollector) external onlyGovernor {
        require(_newFeeCollector != address(0), "fee-collector-is-zero-address");
        require(feeCollector != _newFeeCollector, "same-fee-collector");
        emit UpdatedFeeCollector(feeCollector, _newFeeCollector);
        feeCollector = _newFeeCollector;
    }

    /**
     * @notice Update pool rewards contract address for this pool
     * @param _newPoolRewards new pool rewards contract address
     */
    function updatePoolRewards(address _newPoolRewards) external onlyGovernor {
        require(IPoolRewards(_newPoolRewards).pool() == address(this), "wrong-pool-in-pool-rewards");
        emit UpdatedPoolRewards(poolRewards, _newPoolRewards);
        poolRewards = _newPoolRewards;
    }

    /**
     * @notice Update withdraw fee for this pool
     * @dev Format: 1500 = 15% fee, 100 = 1%
     * @param _newWithdrawFee new withdraw fee
     */
    function updateWithdrawFee(uint256 _newWithdrawFee) external onlyGovernor {
        require(feeCollector != address(0), "fee-collector-not-set");
        require(_newWithdrawFee <= 10000, "withdraw-fee-limit-reached");
        require(withdrawFee != _newWithdrawFee, "same-withdraw-fee");
        emit UpdatedWithdrawFee(withdrawFee, _newWithdrawFee);
        withdrawFee = _newWithdrawFee;
    }

    /**
     * @notice Deposit ERC20 tokens and receive pool shares depending on the current share price.
     * @param _amount ERC20 token amount.
     */
    function deposit(uint256 _amount) external virtual nonReentrant whenNotPaused {
        _deposit(_amount);
    }

    /**
     * @notice Deposit ERC20 tokens with permit aka gasless approval.
     * @param _amount ERC20 token amount.
     * @param _deadline The time at which signature will expire
     * @param _v The recovery byte of the signature
     * @param _r Half of the ECDSA signature pair
     * @param _s Half of the ECDSA signature pair
     */
    function depositWithPermit(
        uint256 _amount,
        uint256 _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external virtual nonReentrant whenNotPaused {
        IVesperPool(address(token)).permit(_msgSender(), address(this), _amount, _deadline, _v, _r, _s);
        _deposit(_amount);
    }

    /**
     * @notice Withdraw collateral based on given shares and the current share price.
     * Transfer earned rewards to caller. Withdraw fee, if any, will be deduced from
     * given shares and transferred to feeCollector. Burn remaining shares and return collateral.
     * @param _shares Pool shares. It will be in 18 decimals.
     */
    function withdraw(uint256 _shares) external virtual nonReentrant whenNotShutdown {
        _withdraw(_shares);
    }

    /**
     * @notice Withdraw collateral based on given shares and the current share price.
     * Transfer earned rewards to caller. Burn shares and return collateral.
     * @dev No withdraw fee will be assessed when this function is called.
     * Only some white listed address can call this function.
     * @param _shares Pool shares. It will be in 18 decimals.
     */
    function withdrawByStrategy(uint256 _shares) external virtual nonReentrant whenNotShutdown {
        require(feeWhiteList.get(_msgSender()) != 0, "Not a white listed address");
        _withdrawByStrategy(_shares);
    }

    /**
     * @notice Transfer tokens to multiple recipient
     * @dev Left 160 bits are the recipient address and the right 96 bits are the token amount.
     * @param _bits array of uint
     * @return true/false
     */
    function multiTransfer(uint256[] memory _bits) external returns (bool) {
        for (uint256 i = 0; i < _bits.length; i++) {
            address a = address(uint160(_bits[i] >> 96));
            uint256 amount = _bits[i] & ((1 << 96) - 1);
            require(transfer(a, amount), "Transfer failed");
        }
        return true;
    }

    /**
     * @notice Triggers an approval from owner to spends
     * @param _owner The address to approve from
     * @param _spender The address to be approved
     * @param _amount The number of tokens that are approved (2^256-1 means infinite)
     * @param _deadline The time at which to expire the signature
     * @param _v The recovery byte of the signature
     * @param _r Half of the ECDSA signature pair
     * @param _s Half of the ECDSA signature pair
     */
    function permit(
        address _owner,
        address _spender,
        uint256 _amount,
        uint256 _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        require(_deadline >= block.timestamp, "Expired");
        bytes32 digest =
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    domainSeparator,
                    keccak256(abi.encode(PERMIT_TYPEHASH, _owner, _spender, _amount, nonces[_owner]++, _deadline))
                )
            );
        address signatory = ecrecover(digest, _v, _r, _s);
        require(signatory != address(0) && signatory == _owner, "Invalid signature");
        _approve(_owner, _spender, _amount);
    }

    /**
     * @notice Get price per share
     * @dev Return value will be in token defined decimals.
     */
    function pricePerShare() public view returns (uint256) {
        if (totalSupply() == 0 || totalValue() == 0) {
            return convertFrom18(1e18);
        }
        return (totalValue() * 1e18) / totalSupply();
    }

    /// @dev Convert from 18 decimals to token defined decimals. Default no conversion.
    function convertFrom18(uint256 _amount) public view virtual returns (uint256) {
        return _amount;
    }

    /// @dev Returns the token stored in the pool. It will be in token defined decimals.
    function tokensHere() public view virtual returns (uint256) {
        return token.balanceOf(address(this));
    }

    /**
     * @dev Returns sum of token locked in other contracts and token stored in the pool.
     * Default tokensHere. It will be in token defined decimals.
     */
    function totalValue() public view virtual returns (uint256);

    /**
     * @dev Hook that is called just before burning tokens. This withdraw collatoral from withdraw queue
     * @param _share Pool share in 18 decimals
     */
    function _beforeBurning(uint256 _share) internal virtual returns (uint256) {}

    /**
     * @dev Hook that is called just after burning tokens.
     * @param _amount Collateral amount in collateral token defined decimals.
     */
    function _afterBurning(uint256 _amount) internal virtual returns (uint256) {}

    /**
     * @dev Hook that is called just before minting new tokens. To be used i.e.
     * if the deposited amount is to be transferred from user to this contract.
     * @param _amount Collateral amount in collateral token defined decimals.
     */
    function _beforeMinting(uint256 _amount) internal virtual {}

    /**
     * @dev Hook that is called just after minting new tokens. To be used i.e.
     * if the deposited amount is to be transferred to a different contract.
     * @param _amount Collateral amount in collateral token defined decimals.
     */
    function _afterMinting(uint256 _amount) internal virtual {}

    /**
     * @dev Calculate shares to mint based on the current share price and given amount.
     * @param amount Collateral amount in collateral token defined decimals.
     * @return share amount in 18 decimal
     */
    function _calculateShares(uint256 _amount) internal view returns (uint256) {
        require(_amount != 0, "amount is 0");
        return (_amount * 1e18) / pricePerShare();
    }

    /// @dev Deposit incoming token and mint pool token i.e. shares.
    function _deposit(uint256 _amount) internal whenNotPaused {
        uint256 _shares = _calculateShares(_amount);
        _beforeMinting(_amount);
        _mint(_msgSender(), _shares);
        _afterMinting(_amount);
        emit Deposit(_msgSender(), _shares, _amount);
    }

    /// @dev Handle withdraw fee calculation and fee transfer to fee collector.
    function _handleFee(uint256 _shares) internal returns (uint256 _sharesAfterFee) {
        if (withdrawFee != 0) {
            uint256 _fee = (_shares * withdrawFee) / MAX_BPS;
            _sharesAfterFee = _shares - _fee;
            _transfer(_msgSender(), feeCollector, _fee);
        } else {
            _sharesAfterFee = _shares;
        }
    }

    /// @dev Update pool reward of sender and receiver before transfer.
    function _beforeTokenTransfer(
        address _from,
        address _to,
        uint256 /* amount */
    ) internal virtual override {
        if (poolRewards != address(0)) {
            if (_from != address(0)) {
                IPoolRewards(poolRewards).updateReward(_from);
            }
            if (_to != address(0)) {
                IPoolRewards(poolRewards).updateReward(_to);
            }
        }
    }

    /// @dev Burns shares and returns the collateral value, after fee, of those.
    function _withdraw(uint256 _shares) internal whenNotShutdown {
        require(_shares != 0, "share is 0");
        // withdraw amount for the shares before fee
        uint256 _amountWithdrawn = _beforeBurning(_shares);
        // recalculate proportional share on actual amount withdrawn
        uint256 _proportionalShares = _calculateShares(_amountWithdrawn);
        if (_proportionalShares > _shares) {
            _proportionalShares = _shares;
        }
        uint256 _sharesAfterFee = _handleFee(_proportionalShares);
        _burn(_msgSender(), _sharesAfterFee);
        _afterBurning(_amountWithdrawn);
        emit Withdraw(_msgSender(), _proportionalShares, _amountWithdrawn);
    }

    /// @dev Burns shares and returns the collateral value of those.
    function _withdrawByStrategy(uint256 _shares) internal {
        require(_shares != 0, "share is 0");
        uint256 _amountWithdrawn = _beforeBurning(_shares);
        uint256 _proportionalShares = _calculateShares(_amountWithdrawn);
        if (_proportionalShares > _shares) {
            _proportionalShares = _shares;
        }
        _burn(_msgSender(), _proportionalShares);
        _afterBurning(_amountWithdrawn);
        emit Withdraw(_msgSender(), _proportionalShares, _amountWithdrawn);
    }
}
