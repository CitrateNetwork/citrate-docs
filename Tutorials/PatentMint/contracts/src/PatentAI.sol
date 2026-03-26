// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "citrate-contracts/lib/AccessControl.sol";

/**
 * @title PatentAI
 * @notice On-chain patent classification and prior art scoring using
 *         Citrate's AI precompiles. Stores classification results on-chain
 *         to enable decentralized patent search.
 *
 *         - classifyPatent: Uses embeddings precompile (0x1001) for categorization
 *         - scorePriorArt: Cosine similarity between patent embeddings
 *         - Off-chain AI (claim drafting, abstract gen) stores results on IPFS
 */
contract PatentAI is AccessControl {
    // -----------------------------------------------------------------------
    //  Types
    // -----------------------------------------------------------------------

    enum PatentCategory { UTILITY, DESIGN, PLANT, PROVISIONAL, SOFTWARE }

    struct Classification {
        uint256 patentId;
        PatentCategory category;
        uint256 confidence;       // 0-10000 (basis points, e.g., 9500 = 95%)
        bytes32 embeddingHash;    // Hash of the embedding vector (stored off-chain)
        uint256 classifiedAt;
    }

    struct PriorArtScore {
        uint256 patentId;
        uint256 candidateId;
        uint256 similarity;       // 0-10000 (basis points)
        uint256 scoredAt;
    }

    // -----------------------------------------------------------------------
    //  Constants
    // -----------------------------------------------------------------------

    bytes32 public constant CLASSIFIER_ROLE = keccak256("CLASSIFIER_ROLE");

    /// @dev Address of the Citrate embeddings precompile.
    address public constant EMBEDDINGS_PRECOMPILE = address(0x1001);

    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    /// @notice patentId => classification
    mapping(uint256 => Classification) public classifications;

    /// @notice patentId => candidateId => score
    mapping(uint256 => mapping(uint256 => PriorArtScore)) public priorArtScores;

    /// @notice category => patentIds (for search)
    mapping(PatentCategory => uint256[]) public categoryPatents;

    /// @notice Total patents classified.
    uint256 public totalClassified;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    event PatentClassified(
        uint256 indexed patentId,
        PatentCategory category,
        uint256 confidence,
        bytes32 embeddingHash
    );
    event PriorArtScored(
        uint256 indexed patentId,
        uint256 indexed candidateId,
        uint256 similarity
    );

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CLASSIFIER_ROLE, msg.sender);
    }

    // -----------------------------------------------------------------------
    //  Classification
    // -----------------------------------------------------------------------

    /**
     * @notice Store a patent classification result. In production, the classifier
     *         calls the embeddings precompile off-chain and submits the result.
     * @param patentId      Token ID of the patent.
     * @param category      Assigned category.
     * @param confidence    Confidence score (0-10000 bps).
     * @param embeddingHash Hash of the embedding vector (full vector stored on IPFS).
     */
    function classifyPatent(
        uint256 patentId,
        PatentCategory category,
        uint256 confidence,
        bytes32 embeddingHash
    ) external onlyRole(CLASSIFIER_ROLE) {
        require(confidence <= 10000, "AI: confidence out of range");
        require(embeddingHash != bytes32(0), "AI: zero embedding hash");

        // If reclassifying, remove from old category index
        Classification memory existing = classifications[patentId];
        if (existing.classifiedAt > 0 && existing.category != category) {
            _removeFromCategoryIndex(existing.category, patentId);
        }

        classifications[patentId] = Classification({
            patentId: patentId,
            category: category,
            confidence: confidence,
            embeddingHash: embeddingHash,
            classifiedAt: block.timestamp
        });

        if (existing.classifiedAt == 0) {
            totalClassified++;
        }

        categoryPatents[category].push(patentId);

        emit PatentClassified(patentId, category, confidence, embeddingHash);
    }

    // -----------------------------------------------------------------------
    //  Prior Art Scoring
    // -----------------------------------------------------------------------

    /**
     * @notice Store a prior art similarity score between two patents.
     * @param patentId    The patent being checked.
     * @param candidateId The potential prior art patent.
     * @param similarity  Cosine similarity (0-10000 bps).
     */
    function scorePriorArt(
        uint256 patentId,
        uint256 candidateId,
        uint256 similarity
    ) external onlyRole(CLASSIFIER_ROLE) {
        require(similarity <= 10000, "AI: similarity out of range");
        require(patentId != candidateId, "AI: self-comparison");

        priorArtScores[patentId][candidateId] = PriorArtScore({
            patentId: patentId,
            candidateId: candidateId,
            similarity: similarity,
            scoredAt: block.timestamp
        });

        emit PriorArtScored(patentId, candidateId, similarity);
    }

    // -----------------------------------------------------------------------
    //  Views
    // -----------------------------------------------------------------------

    function getClassification(uint256 patentId) external view returns (Classification memory) {
        return classifications[patentId];
    }

    function getPriorArtScore(uint256 patentId, uint256 candidateId) external view returns (PriorArtScore memory) {
        return priorArtScores[patentId][candidateId];
    }

    function getPatentsByCategory(PatentCategory category) external view returns (uint256[] memory) {
        return categoryPatents[category];
    }

    // -----------------------------------------------------------------------
    //  Internal
    // -----------------------------------------------------------------------

    function _removeFromCategoryIndex(PatentCategory category, uint256 patentId) internal {
        uint256[] storage ids = categoryPatents[category];
        for (uint i = 0; i < ids.length; i++) {
            if (ids[i] == patentId) {
                ids[i] = ids[ids.length - 1];
                ids.pop();
                break;
            }
        }
    }
}
