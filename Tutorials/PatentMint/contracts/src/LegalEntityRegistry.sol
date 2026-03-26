// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "citrate-contracts/lib/AccessControl.sol";

/**
 * @title LegalEntityRegistry
 * @notice Phase 1: Admin-curated directory of licensed law firms with
 *         jurisdiction and IP-type tagging. Recommendations only — all
 *         engagement is between inventor and firm, off-platform.
 *         Platform NEVER provides legal advice or funds litigation.
 */
contract LegalEntityRegistry is AccessControl {
    // -----------------------------------------------------------------------
    //  Types
    // -----------------------------------------------------------------------

    enum IPType { PATENT, TRADEMARK, COPYRIGHT }

    struct LegalEntity {
        string name;
        string metadataCID;       // IPFS: firm profile, contact info, specialties
        address entityAddress;
        string[] jurisdictions;   // ISO 3166-1 alpha-2 codes
        IPType[] specialties;
        bool isActive;
        uint256 registeredAt;
    }

    // -----------------------------------------------------------------------
    //  Constants
    // -----------------------------------------------------------------------

    bytes32 public constant CURATOR_ROLE = keccak256("CURATOR_ROLE");

    /// @notice On-chain disclaimer — always displayed to users.
    string public constant LEGAL_DISCLAIMER =
        "This platform provides directory information only. "
        "It does not provide legal advice, fund litigation, or "
        "guarantee the quality of any legal services. All "
        "engagement with legal entities is at the user's sole "
        "risk and discretion.";

    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    uint256 private _nextEntityId = 1;

    mapping(uint256 => LegalEntity) public entities;
    uint256[] public activeEntityIds;

    /// @notice jurisdiction => entity IDs
    mapping(string => uint256[]) public jurisdictionIndex;

    /// @notice IPType => entity IDs
    mapping(IPType => uint256[]) public specialtyIndex;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    event EntityRegistered(uint256 indexed entityId, string name, string[] jurisdictions);
    event EntityDeactivated(uint256 indexed entityId);
    event EntityReactivated(uint256 indexed entityId);

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CURATOR_ROLE, msg.sender);
    }

    // -----------------------------------------------------------------------
    //  Curator functions
    // -----------------------------------------------------------------------

    function registerEntity(
        string calldata name,
        string calldata metadataCID,
        address entityAddress,
        string[] calldata jurisdictions,
        IPType[] calldata specialties
    ) external onlyRole(CURATOR_ROLE) returns (uint256 entityId) {
        require(bytes(name).length > 0, "Legal: empty name");
        require(bytes(metadataCID).length > 0, "Legal: empty CID");
        require(jurisdictions.length > 0, "Legal: no jurisdictions");
        require(specialties.length > 0, "Legal: no specialties");

        entityId = _nextEntityId++;
        entities[entityId] = LegalEntity({
            name: name,
            metadataCID: metadataCID,
            entityAddress: entityAddress,
            jurisdictions: jurisdictions,
            specialties: specialties,
            isActive: true,
            registeredAt: block.timestamp
        });

        activeEntityIds.push(entityId);

        for (uint i = 0; i < jurisdictions.length; i++) {
            jurisdictionIndex[jurisdictions[i]].push(entityId);
        }
        for (uint i = 0; i < specialties.length; i++) {
            specialtyIndex[specialties[i]].push(entityId);
        }

        emit EntityRegistered(entityId, name, jurisdictions);
    }

    function deactivateEntity(uint256 entityId) external onlyRole(CURATOR_ROLE) {
        require(entities[entityId].isActive, "Legal: not active");
        entities[entityId].isActive = false;
        emit EntityDeactivated(entityId);
    }

    function reactivateEntity(uint256 entityId) external onlyRole(CURATOR_ROLE) {
        require(!entities[entityId].isActive, "Legal: already active");
        require(entities[entityId].registeredAt > 0, "Legal: not found");
        entities[entityId].isActive = true;
        emit EntityReactivated(entityId);
    }

    // -----------------------------------------------------------------------
    //  Views
    // -----------------------------------------------------------------------

    function getEntity(uint256 entityId) external view returns (LegalEntity memory) {
        return entities[entityId];
    }

    function getByJurisdiction(string calldata jurisdiction) external view returns (uint256[] memory) {
        return jurisdictionIndex[jurisdiction];
    }

    function getBySpecialty(IPType specialty) external view returns (uint256[] memory) {
        return specialtyIndex[specialty];
    }

    function getActiveEntityCount() external view returns (uint256) {
        return activeEntityIds.length;
    }

    function getDisclaimer() external pure returns (string memory) {
        return LEGAL_DISCLAIMER;
    }
}
