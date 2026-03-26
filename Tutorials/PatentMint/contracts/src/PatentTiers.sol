// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "citrate-contracts/lib/AccessControl.sol";

/**
 * @title PatentTiers
 * @notice Manages BASIC / PROTECTED / DEFENDED tier logic for patents.
 *         - BASIC: 0% revenue share
 *         - PROTECTED: 3-5% revenue share
 *         - DEFENDED: 8-15% revenue share
 *         Revenue share activates on first revenue event.
 *         Tiers can only be upgraded, never downgraded.
 */
contract PatentTiers is AccessControl {
    // -----------------------------------------------------------------------
    //  Types
    // -----------------------------------------------------------------------

    enum ProtectionTier { BASIC, PROTECTED, DEFENDED }

    struct TierConfig {
        uint256 minRevShareBps;
        uint256 maxRevShareBps;
        bool hasLegalDirectory;
        bool hasCrossBorderCoord;
        bool hasInfringementMonitor;
        bool hasStakeMarketplace;
    }

    struct PatentTierInfo {
        ProtectionTier tier;
        uint256 revShareBps;      // Inventor-chosen within tier range
        bool revShareActive;      // Activates on first revenue
        uint256 totalRevShared;   // Lifetime revenue shared to ServicePool
    }

    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    /// @notice Tier configuration per protection level.
    mapping(ProtectionTier => TierConfig) public tierConfigs;

    /// @notice Tier info per patent.
    mapping(uint256 => PatentTierInfo) public patentTiers;

    /// @notice Address of the ServicePool for revenue distribution.
    address public servicePool;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    event TierSet(uint256 indexed patentId, ProtectionTier tier, uint256 revShareBps);
    event TierUpgraded(uint256 indexed patentId, ProtectionTier oldTier, ProtectionTier newTier, uint256 revShareBps);
    event RevenueShared(uint256 indexed patentId, uint256 ownerAmount, uint256 poolAmount);

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    constructor(address _servicePool) {
        require(_servicePool != address(0), "Tiers: zero address");
        servicePool = _servicePool;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // BASIC: 0% share, no extras
        tierConfigs[ProtectionTier.BASIC] = TierConfig({
            minRevShareBps: 0,
            maxRevShareBps: 0,
            hasLegalDirectory: false,
            hasCrossBorderCoord: false,
            hasInfringementMonitor: false,
            hasStakeMarketplace: false
        });

        // PROTECTED: 3-5% share
        tierConfigs[ProtectionTier.PROTECTED] = TierConfig({
            minRevShareBps: 300,
            maxRevShareBps: 500,
            hasLegalDirectory: true,
            hasCrossBorderCoord: true,
            hasInfringementMonitor: false,
            hasStakeMarketplace: false
        });

        // DEFENDED: 8-15% share
        tierConfigs[ProtectionTier.DEFENDED] = TierConfig({
            minRevShareBps: 800,
            maxRevShareBps: 1500,
            hasLegalDirectory: true,
            hasCrossBorderCoord: true,
            hasInfringementMonitor: true,
            hasStakeMarketplace: true
        });
    }

    // -----------------------------------------------------------------------
    //  Tier management (called by PatentNFT)
    // -----------------------------------------------------------------------

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /**
     * @notice Set initial tier for a newly minted patent. Only callable by MINTER_ROLE (PatentNFT).
     * @param patentId    Token ID of the patent.
     * @param tier        Selected tier.
     * @param revShareBps Revenue share in basis points (must be within tier range).
     */
    function setInitialTier(uint256 patentId, ProtectionTier tier, uint256 revShareBps) external onlyRole(MINTER_ROLE) {
        TierConfig memory cfg = tierConfigs[tier];
        require(revShareBps >= cfg.minRevShareBps && revShareBps <= cfg.maxRevShareBps,
            "Tiers: revShare out of range");

        patentTiers[patentId] = PatentTierInfo({
            tier: tier,
            revShareBps: revShareBps,
            revShareActive: false,
            totalRevShared: 0
        });

        emit TierSet(patentId, tier, revShareBps);
    }

    /**
     * @notice Upgrade a patent's tier (can only go up, never down).
     * @param patentId    Token ID.
     * @param newTier     New tier (must be higher than current).
     * @param revShareBps Revenue share for the new tier.
     */
    function upgradeTier(
        uint256 patentId,
        ProtectionTier newTier,
        uint256 revShareBps
    ) external {
        require(_isPatentOwner(patentId, msg.sender), "Tiers: not owner");
        PatentTierInfo storage info = patentTiers[patentId];
        require(newTier > info.tier, "Tiers: can only upgrade");

        TierConfig memory cfg = tierConfigs[newTier];
        require(revShareBps >= cfg.minRevShareBps && revShareBps <= cfg.maxRevShareBps,
            "Tiers: revShare out of range");

        ProtectionTier oldTier = info.tier;
        info.tier = newTier;
        info.revShareBps = revShareBps;

        emit TierUpgraded(patentId, oldTier, newTier, revShareBps);
    }

    // -----------------------------------------------------------------------
    //  Revenue distribution
    // -----------------------------------------------------------------------

    /**
     * @notice Distribute revenue for a patent according to its tier.
     *         Returns the amount that goes to the patent owner.
     * @param patentId Token ID.
     * @param amount   Total revenue in wei.
     * @return ownerAmount Amount for the patent owner.
     */
    function distributeRevenue(uint256 patentId, uint256 amount) external payable returns (uint256 ownerAmount) {
        require(msg.value == amount, "Tiers: value mismatch");

        PatentTierInfo storage info = patentTiers[patentId];

        // BASIC tier: 100% to owner
        if (info.tier == ProtectionTier.BASIC || info.revShareBps == 0) {
            return amount;
        }

        // Activate revenue share on first revenue event
        if (!info.revShareActive) {
            info.revShareActive = true;
        }

        uint256 poolAmount = (amount * info.revShareBps) / 10000;
        ownerAmount = amount - poolAmount;
        info.totalRevShared += poolAmount;

        // Send pool share to ServicePool
        (bool ok, ) = servicePool.call{value: poolAmount}("");
        require(ok, "Tiers: pool transfer failed");

        emit RevenueShared(patentId, ownerAmount, poolAmount);
    }

    // -----------------------------------------------------------------------
    //  Views
    // -----------------------------------------------------------------------

    function getTier(uint256 patentId) external view returns (PatentTierInfo memory) {
        return patentTiers[patentId];
    }

    function getTierConfig(ProtectionTier tier) external view returns (TierConfig memory) {
        return tierConfigs[tier];
    }

    function hasFeature(uint256 patentId, string calldata feature) external view returns (bool) {
        TierConfig memory cfg = tierConfigs[patentTiers[patentId].tier];
        bytes32 h = keccak256(bytes(feature));
        if (h == keccak256("legalDirectory")) return cfg.hasLegalDirectory;
        if (h == keccak256("crossBorder")) return cfg.hasCrossBorderCoord;
        if (h == keccak256("infringementMonitor")) return cfg.hasInfringementMonitor;
        if (h == keccak256("stakeMarketplace")) return cfg.hasStakeMarketplace;
        return false;
    }

    // -----------------------------------------------------------------------
    //  Internal (overridden by PatentNFT)
    // -----------------------------------------------------------------------

    function _isPatentOwner(uint256, address) internal view virtual returns (bool) {
        return false;
    }
}
