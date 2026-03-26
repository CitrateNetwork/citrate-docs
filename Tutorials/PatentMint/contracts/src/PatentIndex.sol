// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "citrate-contracts/lib/AccessControl.sol";

/**
 * @title PatentIndex
 * @notice Category-based patent index with Merkle root for verifiable completeness.
 *         Enables decentralized patent search by maintaining on-chain category indexes.
 */
contract PatentIndex is AccessControl {
    // -----------------------------------------------------------------------
    //  Types
    // -----------------------------------------------------------------------

    struct IndexEntry {
        uint256 patentId;
        string cid;
        uint8 category;
        uint256 timestamp;
    }

    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    bytes32 public constant INDEXER_ROLE = keccak256("INDEXER_ROLE");

    /// @notice All index entries in order.
    IndexEntry[] public entries;

    /// @notice category => patentIds
    mapping(uint8 => uint256[]) public categoryIndex;

    /// @notice patentId => entry index in the entries array
    mapping(uint256 => uint256) public patentEntryIndex;

    /// @notice Current Merkle root of all entries (updated on each addition).
    bytes32 public merkleRoot;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    event PatentIndexed(uint256 indexed patentId, string cid, uint8 category, uint256 timestamp);
    event MerkleRootUpdated(bytes32 newRoot);

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(INDEXER_ROLE, msg.sender);
    }

    // -----------------------------------------------------------------------
    //  Indexing
    // -----------------------------------------------------------------------

    /**
     * @notice Add a patent to the index.
     */
    function addToIndex(
        uint256 patentId,
        string calldata cid,
        uint8 category
    ) external onlyRole(INDEXER_ROLE) {
        require(bytes(cid).length > 0, "Index: empty CID");

        uint256 idx = entries.length;
        entries.push(IndexEntry({
            patentId: patentId,
            cid: cid,
            category: category,
            timestamp: block.timestamp
        }));

        categoryIndex[category].push(patentId);
        patentEntryIndex[patentId] = idx;

        // Update Merkle root (simple rolling hash for gas efficiency)
        merkleRoot = keccak256(abi.encodePacked(merkleRoot, patentId, cid, category, block.timestamp));

        emit PatentIndexed(patentId, cid, category, block.timestamp);
        emit MerkleRootUpdated(merkleRoot);
    }

    // -----------------------------------------------------------------------
    //  Views
    // -----------------------------------------------------------------------

    function getEntry(uint256 index) external view returns (IndexEntry memory) {
        require(index < entries.length, "Index: out of bounds");
        return entries[index];
    }

    function getByCategory(uint8 category) external view returns (uint256[] memory) {
        return categoryIndex[category];
    }

    function totalEntries() external view returns (uint256) {
        return entries.length;
    }

    function getMerkleRoot() external view returns (bytes32) {
        return merkleRoot;
    }
}
