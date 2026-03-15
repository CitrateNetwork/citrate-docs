// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ModelNFT
 * @notice ERC-721 tokens representing AI models pinned to IPFS.
 *         Each token stores on-chain metadata (name, framework, IPFS CID,
 *         SHA-256 model hash, file size) and renders a fully on-chain SVG.
 */
contract ModelNFT is ERC721Enumerable, Ownable, ReentrancyGuard {
    using Strings for uint256;

    // -----------------------------------------------------------------------
    //  Types
    // -----------------------------------------------------------------------

    struct ModelInfo {
        string name;
        string framework;   // "CoreML", "ONNX", "PyTorch", etc.
        string ipfsCID;      // IPFS content identifier for model weights
        bytes32 modelHash;   // SHA-256 hash of model data
        uint256 sizeBytes;   // Model file size in bytes
        address creator;     // Original minter
        uint256 createdAt;   // Block timestamp at mint
    }

    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    uint256 private _nextTokenId;
    uint256 public mintFee;

    mapping(uint256 => ModelInfo) private _models;
    mapping(address => uint256[]) private _creatorTokens;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    event ModelMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string ipfsCID
    );
    event MintFeeUpdated(uint256 oldFee, uint256 newFee);

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    constructor(uint256 _mintFee) ERC721("Citrate Model NFT", "MODEL") Ownable(msg.sender) {
        mintFee = _mintFee;
    }

    // -----------------------------------------------------------------------
    //  Public / External — Minting
    // -----------------------------------------------------------------------

    /**
     * @notice Mint a new Model NFT bound to an IPFS CID.
     * @param name        Human-readable model name (non-empty).
     * @param framework   ML framework identifier (e.g. "PyTorch").
     * @param ipfsCID     IPFS content identifier for the model weights (non-empty).
     * @param modelHash   SHA-256 hash of the model data (non-zero).
     * @param sizeBytes   File size in bytes.
     * @return tokenId    The newly minted token ID.
     */
    function mintModel(
        string calldata name,
        string calldata framework,
        string calldata ipfsCID,
        bytes32 modelHash,
        uint256 sizeBytes
    ) external payable nonReentrant returns (uint256 tokenId) {
        require(bytes(name).length > 0, "ModelNFT: empty name");
        require(bytes(ipfsCID).length > 0, "ModelNFT: empty CID");
        require(modelHash != bytes32(0), "ModelNFT: zero hash");
        require(msg.value >= mintFee, "ModelNFT: insufficient fee");

        tokenId = _nextTokenId++;

        _safeMint(msg.sender, tokenId);

        _models[tokenId] = ModelInfo({
            name: name,
            framework: framework,
            ipfsCID: ipfsCID,
            modelHash: modelHash,
            sizeBytes: sizeBytes,
            creator: msg.sender,
            createdAt: block.timestamp
        });

        _creatorTokens[msg.sender].push(tokenId);

        emit ModelMinted(tokenId, msg.sender, ipfsCID);
    }

    // -----------------------------------------------------------------------
    //  Public / External — Views
    // -----------------------------------------------------------------------

    /**
     * @notice Get full metadata for a minted model.
     */
    function getModelInfo(uint256 tokenId) external view returns (ModelInfo memory) {
        _requireOwned(tokenId);
        return _models[tokenId];
    }

    /**
     * @notice Get all token IDs minted by a given creator.
     */
    function getModelsByCreator(address creator) external view returns (uint256[] memory) {
        return _creatorTokens[creator];
    }

    // -----------------------------------------------------------------------
    //  Public — On-chain tokenURI (SVG + Base64 JSON)
    // -----------------------------------------------------------------------

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        ModelInfo storage m = _models[tokenId];
        string memory svg = _generateSVG(tokenId, m);

        string memory json = string(
            abi.encodePacked(
                '{"name":"', m.name,
                '","description":"AI model NFT on Citrate. Framework: ', m.framework,
                '. IPFS CID: ', m.ipfsCID,
                '","image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)),
                '","attributes":[',
                    '{"trait_type":"Framework","value":"', m.framework, '"},',
                    '{"trait_type":"Size (bytes)","value":"', m.sizeBytes.toString(), '"},',
                    '{"trait_type":"Creator","value":"', Strings.toHexString(m.creator), '"},',
                    '{"trait_type":"Token ID","value":"', tokenId.toString(), '"}',
                ']}'
            )
        );

        return string(
            abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json)))
        );
    }

    // -----------------------------------------------------------------------
    //  Owner-only
    // -----------------------------------------------------------------------

    function setMintFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = mintFee;
        mintFee = newFee;
        emit MintFeeUpdated(oldFee, newFee);
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "ModelNFT: nothing to withdraw");
        (bool ok, ) = payable(owner()).call{value: balance}("");
        require(ok, "ModelNFT: withdraw failed");
    }

    // -----------------------------------------------------------------------
    //  Internal — SVG Generation
    // -----------------------------------------------------------------------

    function _generateSVG(uint256 tokenId, ModelInfo storage m) internal view returns (string memory) {
        // Derive accent colour from tokenId
        string memory accent = _accentColor(tokenId);
        // Truncate CID for display: first 8 + last 4 chars
        string memory cidShort = _truncateCID(m.ipfsCID);

        return string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480" width="400" height="480">',
                '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">',
                '<stop offset="0%" stop-color="#0a0a1a"/><stop offset="100%" stop-color="#1a1a2e"/>',
                '</linearGradient></defs>',
                '<rect width="400" height="480" fill="url(#bg)" rx="16"/>',
                // Accent bar
                '<rect y="0" width="400" height="6" fill="', accent, '" rx="3"/>',
                // Model icon circle
                '<circle cx="200" cy="120" r="50" fill="', accent, '" opacity="0.15"/>',
                '<circle cx="200" cy="120" r="30" fill="', accent, '" opacity="0.3"/>',
                '<text x="200" y="130" font-family="monospace" font-size="28" fill="', accent,
                '" text-anchor="middle" font-weight="bold">AI</text>',
                // Name
                '<text x="200" y="210" font-family="sans-serif" font-size="20" fill="white" text-anchor="middle" font-weight="600">',
                m.name, '</text>',
                // Framework badge
                '<rect x="140" y="225" width="120" height="26" rx="13" fill="', accent, '" opacity="0.2"/>',
                '<text x="200" y="243" font-family="monospace" font-size="12" fill="', accent,
                '" text-anchor="middle">', m.framework, '</text>',
                // CID
                '<text x="200" y="290" font-family="monospace" font-size="11" fill="#9ca3af" text-anchor="middle">CID: ',
                cidShort, '</text>',
                // Size
                '<text x="200" y="310" font-family="monospace" font-size="11" fill="#6b7280" text-anchor="middle">',
                _formatSize(m.sizeBytes), '</text>',
                // Token ID footer
                '<text x="200" y="450" font-family="monospace" font-size="16" fill="#6b7280" text-anchor="middle">#',
                tokenId.toString(), '</text>',
                // Citrate brand
                '<text x="200" y="470" font-family="monospace" font-size="9" fill="#374151" text-anchor="middle">CITRATE MODEL NFT</text>',
                '</svg>'
            )
        );
    }

    function _accentColor(uint256 tokenId) internal pure returns (string memory) {
        // Rotate through pleasant accent hues
        uint256 hue = (tokenId * 47 + 230) % 360;
        // Return as hsl() string
        return string(
            abi.encodePacked(
                "hsl(", hue.toString(), ",70%,60%)"
            )
        );
    }

    function _truncateCID(string memory cid) internal pure returns (string memory) {
        bytes memory b = bytes(cid);
        if (b.length <= 16) return cid;

        bytes memory result = new bytes(15); // 8 + "..." + 4
        for (uint256 i = 0; i < 8; i++) result[i] = b[i];
        result[8] = ".";
        result[9] = ".";
        result[10] = ".";
        for (uint256 i = 0; i < 4; i++) result[11 + i] = b[b.length - 4 + i];
        return string(result);
    }

    function _formatSize(uint256 sizeBytes) internal pure returns (string memory) {
        if (sizeBytes >= 1_073_741_824) {
            return string(abi.encodePacked((sizeBytes / 1_073_741_824).toString(), " GB"));
        } else if (sizeBytes >= 1_048_576) {
            return string(abi.encodePacked((sizeBytes / 1_048_576).toString(), " MB"));
        } else if (sizeBytes >= 1024) {
            return string(abi.encodePacked((sizeBytes / 1024).toString(), " KB"));
        }
        return string(abi.encodePacked(sizeBytes.toString(), " B"));
    }

    // -----------------------------------------------------------------------
    //  Required overrides (ERC721Enumerable)
    // -----------------------------------------------------------------------

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 amount)
        internal
        override(ERC721Enumerable)
    {
        super._increaseBalance(account, amount);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
