// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "citrate-contracts/lib/AccessControl.sol";

/**
 * @title KYCRegistry
 * @notice Soulbound (non-transferable) identity credentials for PatentMint.
 *         Minted by a VERIFIER_ROLE after off-chain KYC via a third-party provider.
 *         No PII is stored on-chain — only verification level, jurisdiction, and a
 *         provider hash proving the check occurred.
 * @dev Implements ERC-5192 (Minimal Soulbound Interface) without full ERC-721
 *      to keep gas low. Credentials are non-transferable by design.
 */
contract KYCRegistry is AccessControl {
    // -----------------------------------------------------------------------
    //  Types
    // -----------------------------------------------------------------------

    enum VerificationLevel { NONE, INDIVIDUAL, BUSINESS, INTERNATIONAL }

    struct KYCCredential {
        VerificationLevel level;
        string jurisdiction;      // ISO 3166-1 alpha-2 ("US", "JP", "DE", etc.)
        uint256 verifiedAt;
        uint256 expiresAt;
        bytes32 providerHash;     // keccak256(providerName, verificationId) — no PII
        bool isActive;
    }

    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    /// @notice Expiry durations per verification level.
    uint256 public constant INDIVIDUAL_VALIDITY = 365 days;
    uint256 public constant BUSINESS_VALIDITY = 180 days;
    uint256 public constant INTERNATIONAL_VALIDITY = 180 days;

    /// @notice Credential per wallet address.
    mapping(address => KYCCredential) public credentials;

    /// @notice Total credentials issued (for stats).
    uint256 public totalCredentials;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    event CredentialMinted(
        address indexed user,
        VerificationLevel level,
        string jurisdiction,
        uint256 expiresAt,
        bytes32 providerHash
    );
    event CredentialRevoked(address indexed user, address indexed revoker);
    event CredentialRenewed(address indexed user, uint256 newExpiresAt);

    // ERC-5192 event
    event Locked(uint256 indexed tokenId);

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    // -----------------------------------------------------------------------
    //  Verifier functions
    // -----------------------------------------------------------------------

    /**
     * @notice Mint a soulbound KYC credential for a user.
     * @param user         Wallet address of the verified user.
     * @param level        Verification level achieved.
     * @param jurisdiction ISO 3166-1 alpha-2 country code.
     * @param providerHash keccak256 of provider name + verification ID.
     */
    function mintCredential(
        address user,
        VerificationLevel level,
        string calldata jurisdiction,
        bytes32 providerHash
    ) external onlyRole(VERIFIER_ROLE) {
        require(user != address(0), "KYC: zero address");
        require(level != VerificationLevel.NONE, "KYC: invalid level");
        require(bytes(jurisdiction).length == 2, "KYC: invalid jurisdiction");

        uint256 validity = _validityForLevel(level);
        uint256 expiresAt = block.timestamp + validity;

        credentials[user] = KYCCredential({
            level: level,
            jurisdiction: jurisdiction,
            verifiedAt: block.timestamp,
            expiresAt: expiresAt,
            providerHash: providerHash,
            isActive: true
        });

        if (!_hasExistingCredential(user)) {
            totalCredentials++;
        }

        emit CredentialMinted(user, level, jurisdiction, expiresAt, providerHash);
        // ERC-5192: signal the credential is soulbound (locked)
        emit Locked(uint256(uint160(user)));
    }

    /**
     * @notice Revoke a user's KYC credential.
     */
    function revokeCredential(address user) external onlyRole(VERIFIER_ROLE) {
        require(credentials[user].isActive, "KYC: not active");
        credentials[user].isActive = false;
        emit CredentialRevoked(user, msg.sender);
    }

    /**
     * @notice Renew an existing credential (re-verification completed).
     */
    function renewCredential(
        address user,
        bytes32 newProviderHash
    ) external onlyRole(VERIFIER_ROLE) {
        KYCCredential storage cred = credentials[user];
        require(cred.level != VerificationLevel.NONE, "KYC: no credential");

        uint256 validity = _validityForLevel(cred.level);
        cred.expiresAt = block.timestamp + validity;
        cred.verifiedAt = block.timestamp;
        cred.providerHash = newProviderHash;
        cred.isActive = true;

        emit CredentialRenewed(user, cred.expiresAt);
    }

    // -----------------------------------------------------------------------
    //  View functions
    // -----------------------------------------------------------------------

    /**
     * @notice Check if a user meets the minimum verification level and is not expired.
     */
    function isVerified(address user, VerificationLevel minLevel) external view returns (bool) {
        KYCCredential memory cred = credentials[user];
        return cred.isActive
            && cred.level >= minLevel
            && block.timestamp < cred.expiresAt;
    }

    /**
     * @notice Get full credential details for a user.
     */
    function getCredential(address user) external view returns (KYCCredential memory) {
        return credentials[user];
    }

    /**
     * @notice Days until a credential expires (0 if already expired or inactive).
     */
    function daysUntilExpiry(address user) external view returns (uint256) {
        KYCCredential memory cred = credentials[user];
        if (!cred.isActive || block.timestamp >= cred.expiresAt) return 0;
        return (cred.expiresAt - block.timestamp) / 1 days;
    }

    // -----------------------------------------------------------------------
    //  Internal
    // -----------------------------------------------------------------------

    function _validityForLevel(VerificationLevel level) internal pure returns (uint256) {
        if (level == VerificationLevel.INDIVIDUAL) return INDIVIDUAL_VALIDITY;
        if (level == VerificationLevel.BUSINESS) return BUSINESS_VALIDITY;
        if (level == VerificationLevel.INTERNATIONAL) return INTERNATIONAL_VALIDITY;
        return 0;
    }

    function _hasExistingCredential(address user) internal view returns (bool) {
        return credentials[user].verifiedAt > 0;
    }
}
