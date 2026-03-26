// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PatentNFT.sol";
import "./PatentTiers.sol";
import "./KYCRegistry.sol";

/**
 * @title PatentLicense
 * @notice Manages licensing agreements for patents. Supports exclusive,
 *         non-exclusive, and time-limited licenses. License fees route through
 *         the tier system for revenue splits. Encrypted document access keys
 *         are managed per-licensee (ChatVault pattern).
 */
contract PatentLicense is ReentrancyGuard {
    // -----------------------------------------------------------------------
    //  Types
    // -----------------------------------------------------------------------

    enum LicenseType { NON_EXCLUSIVE, EXCLUSIVE, TIME_LIMITED }

    struct License {
        uint256 patentId;
        address licensee;
        LicenseType licenseType;
        uint256 fee;              // SALT paid for the license
        uint256 createdAt;
        uint256 expiresAt;        // 0 = perpetual (for non-time-limited)
        bool active;
        bytes encryptedKey;       // AES-256-GCM key encrypted with licensee's public key
    }

    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    PatentNFT public immutable patentNFT;
    PatentTiers public immutable patentTiers;
    KYCRegistry public immutable kycRegistry;

    uint256 private _nextLicenseId = 1;

    /// @notice licenseId => License
    mapping(uint256 => License) public licenses;

    /// @notice patentId => licenseIds
    mapping(uint256 => uint256[]) public patentLicenses;

    /// @notice patentId => licensee => licenseId (latest)
    mapping(uint256 => mapping(address => uint256)) public licenseeIndex;

    /// @notice patentId => has exclusive license active
    mapping(uint256 => bool) public hasExclusiveLicense;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    event LicenseCreated(
        uint256 indexed licenseId,
        uint256 indexed patentId,
        address indexed licensee,
        LicenseType licenseType,
        uint256 fee,
        uint256 expiresAt
    );
    event LicenseRevoked(uint256 indexed licenseId, uint256 indexed patentId, address indexed licensee);
    event AccessGranted(uint256 indexed licenseId, address indexed licensee);

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    constructor(address _patentNFT, address _patentTiers, address _kycRegistry) {
        patentNFT = PatentNFT(_patentNFT);
        patentTiers = PatentTiers(_patentTiers);
        kycRegistry = KYCRegistry(_kycRegistry);
    }

    // -----------------------------------------------------------------------
    //  License creation
    // -----------------------------------------------------------------------

    /**
     * @notice Create a license for a patent. Fee is paid in SALT and routed
     *         through the tier system for revenue splitting.
     */
    function createLicense(
        uint256 patentId,
        address licensee,
        LicenseType licenseType,
        uint256 duration,          // seconds; 0 for perpetual
        bytes calldata encryptedKey
    ) external payable nonReentrant returns (uint256 licenseId) {
        // Only patent owner can create licenses
        require(patentNFT.ownerOf(patentId) == msg.sender, "License: not patent owner");

        // Licensee must be KYC verified
        require(
            kycRegistry.isVerified(licensee, KYCRegistry.VerificationLevel.INDIVIDUAL),
            "License: licensee KYC required"
        );

        // Exclusive license check
        if (licenseType == LicenseType.EXCLUSIVE) {
            require(!hasExclusiveLicense[patentId], "License: exclusive already granted");
            hasExclusiveLicense[patentId] = true;
        } else {
            require(!hasExclusiveLicense[patentId], "License: blocked by exclusive");
        }

        uint256 expiresAt = duration > 0 ? block.timestamp + duration : 0;

        licenseId = _nextLicenseId++;
        licenses[licenseId] = License({
            patentId: patentId,
            licensee: licensee,
            licenseType: licenseType,
            fee: msg.value,
            createdAt: block.timestamp,
            expiresAt: expiresAt,
            active: true,
            encryptedKey: encryptedKey
        });

        patentLicenses[patentId].push(licenseId);
        licenseeIndex[patentId][licensee] = licenseId;

        // Route fee through tier system
        if (msg.value > 0) {
            uint256 ownerAmount = patentTiers.distributeRevenue{value: msg.value}(patentId, msg.value);
            // Send owner's portion to patent owner
            if (ownerAmount > 0) {
                (bool ok, ) = msg.sender.call{value: ownerAmount}("");
                require(ok, "License: owner transfer failed");
            }
        }

        emit LicenseCreated(licenseId, patentId, licensee, licenseType, msg.value, expiresAt);
        emit AccessGranted(licenseId, licensee);
    }

    /**
     * @notice Revoke a license. Only patent owner can revoke.
     */
    function revokeLicense(uint256 licenseId) external {
        License storage lic = licenses[licenseId];
        require(lic.active, "License: not active");
        require(patentNFT.ownerOf(lic.patentId) == msg.sender, "License: not patent owner");

        lic.active = false;
        if (lic.licenseType == LicenseType.EXCLUSIVE) {
            hasExclusiveLicense[lic.patentId] = false;
        }

        emit LicenseRevoked(licenseId, lic.patentId, lic.licensee);
    }

    // -----------------------------------------------------------------------
    //  Views
    // -----------------------------------------------------------------------

    function getLicense(uint256 licenseId) external view returns (License memory) {
        return licenses[licenseId];
    }

    function getLicensesForPatent(uint256 patentId) external view returns (uint256[] memory) {
        return patentLicenses[patentId];
    }

    function isLicenseActive(uint256 licenseId) external view returns (bool) {
        License memory lic = licenses[licenseId];
        if (!lic.active) return false;
        if (lic.expiresAt > 0 && block.timestamp >= lic.expiresAt) return false;
        return true;
    }

    function hasAccess(uint256 patentId, address user) external view returns (bool) {
        // Patent owner always has access
        if (patentNFT.ownerOf(patentId) == user) return true;

        uint256 licId = licenseeIndex[patentId][user];
        if (licId == 0) return false;

        License memory lic = licenses[licId];
        if (!lic.active) return false;
        if (lic.expiresAt > 0 && block.timestamp >= lic.expiresAt) return false;
        return true;
    }
}
