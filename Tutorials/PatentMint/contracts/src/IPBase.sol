// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "citrate-contracts/lib/AccessControl.sol";
import "citrate-contracts/lib/ReentrancyGuard.sol";

/**
 * @title IPBase
 * @notice Abstract base contract for all IP types (patents, trademarks, copyrights).
 *         Provides shared enums, SALT staking, and revenue-split hooks.
 */
abstract contract IPBase is AccessControl, ReentrancyGuard {
    // -----------------------------------------------------------------------
    //  Types
    // -----------------------------------------------------------------------

    enum IPType { PATENT, TRADEMARK, COPYRIGHT }

    enum ProtectionTier { BASIC, PROTECTED, DEFENDED }

    struct StakeInfo {
        uint256 amount;
        uint256 lockedUntil;
        bool refunded;
        bool burned;
    }

    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR_ROLE");

    /// @notice SALT stake required to mint (~$5 USD equivalent, set by admin).
    uint256 public mintStakeAmount;

    /// @notice Duration the stake is locked after minting.
    uint256 public constant STAKE_LOCK_DURATION = 90 days;

    /// @notice Address of the ServicePool that receives revenue share + burned stakes.
    address public servicePool;

    /// @notice tokenId => stake info
    mapping(uint256 => StakeInfo) public stakes;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    event StakeLocked(uint256 indexed tokenId, address indexed staker, uint256 amount, uint256 lockedUntil);
    event StakeRefunded(uint256 indexed tokenId, address indexed staker, uint256 amount);
    event StakeBurned(uint256 indexed tokenId, uint256 amount);
    event MintStakeUpdated(uint256 newAmount);
    event ServicePoolUpdated(address newPool);

    // -----------------------------------------------------------------------
    //  Admin
    // -----------------------------------------------------------------------

    function setMintStakeAmount(uint256 _amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        mintStakeAmount = _amount;
        emit MintStakeUpdated(_amount);
    }

    function setServicePool(address _pool) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_pool != address(0), "IPBase: zero address");
        servicePool = _pool;
        emit ServicePoolUpdated(_pool);
    }

    // -----------------------------------------------------------------------
    //  Staking internals
    // -----------------------------------------------------------------------

    function _lockStake(uint256 tokenId, address staker) internal {
        require(msg.value >= mintStakeAmount, "IPBase: insufficient stake");
        uint256 lockedUntil = block.timestamp + STAKE_LOCK_DURATION;
        stakes[tokenId] = StakeInfo({
            amount: msg.value,
            lockedUntil: lockedUntil,
            refunded: false,
            burned: false
        });

        // Refund excess
        if (msg.value > mintStakeAmount) {
            (bool ok, ) = staker.call{value: msg.value - mintStakeAmount}("");
            require(ok, "IPBase: refund failed");
            stakes[tokenId].amount = mintStakeAmount;
        }

        emit StakeLocked(tokenId, staker, mintStakeAmount, lockedUntil);
    }

    /// @notice Refund stake after lock period (called by token owner).
    function refundStake(uint256 tokenId) external nonReentrant {
        require(_isTokenOwner(tokenId, msg.sender), "IPBase: not owner");
        StakeInfo storage s = stakes[tokenId];
        require(!s.refunded && !s.burned, "IPBase: already settled");
        require(block.timestamp >= s.lockedUntil, "IPBase: still locked");

        s.refunded = true;
        (bool ok, ) = msg.sender.call{value: s.amount}("");
        require(ok, "IPBase: transfer failed");
        emit StakeRefunded(tokenId, msg.sender, s.amount);
    }

    /// @notice Burn stake (spam/duplicate flagged by moderator). Funds go to ServicePool.
    function burnStake(uint256 tokenId) external onlyRole(MODERATOR_ROLE) {
        StakeInfo storage s = stakes[tokenId];
        require(!s.refunded && !s.burned, "IPBase: already settled");
        s.burned = true;
        require(servicePool != address(0), "IPBase: no service pool");
        (bool ok, ) = servicePool.call{value: s.amount}("");
        require(ok, "IPBase: transfer failed");
        emit StakeBurned(tokenId, s.amount);
    }

    // -----------------------------------------------------------------------
    //  Abstract hooks (implemented by child contracts)
    // -----------------------------------------------------------------------

    /// @dev Must return true if `account` owns the given tokenId.
    function _isTokenOwner(uint256 tokenId, address account) internal view virtual returns (bool);
}
