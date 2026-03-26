// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "citrate-contracts/lib/AccessControl.sol";

/**
 * @title PatentIPFS
 * @notice Extends the Citrate IPFS incentive model for patent documents.
 *         Adds PATENT_DOCUMENT type with 2x reward multiplier and links
 *         CIDs to patent IDs for integrity tracking.
 */
contract PatentIPFS is AccessControl {
    // -----------------------------------------------------------------------
    //  Types
    // -----------------------------------------------------------------------

    enum DocumentTier { ACTIVE, STANDARD, HISTORICAL }

    struct PatentDocument {
        uint256 patentId;
        string cid;
        uint256 sizeBytes;
        DocumentTier tier;
        uint256 registeredAt;
        bool pinned;
    }

    // -----------------------------------------------------------------------
    //  Constants
    // -----------------------------------------------------------------------

    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    uint256 public constant ACTIVE_MULTIPLIER = 200;     // 2x
    uint256 public constant STANDARD_MULTIPLIER = 150;   // 1.5x
    uint256 public constant HISTORICAL_MULTIPLIER = 100; // 1x
    uint256 public constant MULTIPLIER_BASE = 100;

    uint256 public constant ACTIVE_THRESHOLD = 2 * 365 days;
    uint256 public constant STANDARD_THRESHOLD = 10 * 365 days;

    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    /// @notice CID => PatentDocument
    mapping(string => PatentDocument) public documents;

    /// @notice patentId => CIDs
    mapping(uint256 => string[]) public patentDocuments;

    /// @notice Total bytes registered across all patents.
    uint256 public totalRegisteredBytes;

    /// @notice Total documents registered.
    uint256 public totalDocuments;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    event DocumentRegistered(uint256 indexed patentId, string cid, uint256 sizeBytes, DocumentTier tier);
    event DocumentPinned(string cid, address indexed pinner);

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender);
    }

    // -----------------------------------------------------------------------
    //  Registration
    // -----------------------------------------------------------------------

    /**
     * @notice Register a patent document on IPFS.
     * @param patentId  The patent this document belongs to.
     * @param cid       IPFS content identifier.
     * @param sizeBytes Size of the document in bytes.
     */
    function registerPatentDocument(
        uint256 patentId,
        string calldata cid,
        uint256 sizeBytes
    ) external onlyRole(REGISTRAR_ROLE) {
        require(bytes(cid).length > 0, "IPFS: empty CID");
        require(sizeBytes > 0, "IPFS: zero size");
        require(documents[cid].registeredAt == 0, "IPFS: CID already registered");

        DocumentTier tier = _calculateTier(block.timestamp);

        documents[cid] = PatentDocument({
            patentId: patentId,
            cid: cid,
            sizeBytes: sizeBytes,
            tier: tier,
            registeredAt: block.timestamp,
            pinned: false
        });

        patentDocuments[patentId].push(cid);
        totalRegisteredBytes += sizeBytes;
        totalDocuments++;

        emit DocumentRegistered(patentId, cid, sizeBytes, tier);
    }

    /**
     * @notice Mark a document as pinned (reported by storage provider).
     */
    function reportPinning(string calldata cid) external {
        require(documents[cid].registeredAt > 0, "IPFS: unknown CID");
        documents[cid].pinned = true;
        emit DocumentPinned(cid, msg.sender);
    }

    // -----------------------------------------------------------------------
    //  Views
    // -----------------------------------------------------------------------

    function getDocument(string calldata cid) external view returns (PatentDocument memory) {
        return documents[cid];
    }

    function getDocumentsForPatent(uint256 patentId) external view returns (string[] memory) {
        return patentDocuments[patentId];
    }

    function getRewardMultiplier(string calldata cid) external view returns (uint256) {
        PatentDocument memory doc = documents[cid];
        require(doc.registeredAt > 0, "IPFS: unknown CID");
        return _multiplierForTier(doc.tier);
    }

    // -----------------------------------------------------------------------
    //  Internal
    // -----------------------------------------------------------------------

    function _calculateTier(uint256 timestamp) internal pure returns (DocumentTier) {
        // New documents start as ACTIVE; tier degrades based on age in future reads
        // For registration, everything starts as ACTIVE
        if (timestamp > 0) return DocumentTier.ACTIVE;
        return DocumentTier.ACTIVE;
    }

    function _multiplierForTier(DocumentTier tier) internal pure returns (uint256) {
        if (tier == DocumentTier.ACTIVE) return ACTIVE_MULTIPLIER;
        if (tier == DocumentTier.STANDARD) return STANDARD_MULTIPLIER;
        return HISTORICAL_MULTIPLIER;
    }

    /**
     * @notice Calculate current tier based on document age.
     */
    function currentTier(string calldata cid) external view returns (DocumentTier) {
        PatentDocument memory doc = documents[cid];
        require(doc.registeredAt > 0, "IPFS: unknown CID");
        uint256 age = block.timestamp - doc.registeredAt;
        if (age < ACTIVE_THRESHOLD) return DocumentTier.ACTIVE;
        if (age < STANDARD_THRESHOLD) return DocumentTier.STANDARD;
        return DocumentTier.HISTORICAL;
    }
}
