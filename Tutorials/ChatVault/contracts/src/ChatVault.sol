// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @title ChatVault — Encrypted Conversation NFTs on Citrate
/// @notice Mint encrypted AI chat conversations as ERC-721 NFTs with IPFS persistence
/// @dev Each token stores an encrypted IPFS CID and metadata hash for integrity verification
contract ChatVault is ERC721Enumerable, Ownable, ReentrancyGuard {
    using Strings for uint256;

    struct Conversation {
        string encryptedCID;    // IPFS CID of AES-256-GCM encrypted conversation blob
        bytes32 metadataHash;   // keccak256(abi.encodePacked(modelId, messageCount, creator))
        uint256 messageCount;   // Number of messages in the conversation
        uint256 modelId;        // On-chain model ID used for inference (0 if none)
        uint256 mintedAt;       // Block timestamp when minted
        address creator;        // Original creator address
    }

    /// @notice Mapping from tokenId to conversation data
    mapping(uint256 => Conversation) private _conversations;

    /// @notice Mapping from creator address to their token IDs
    mapping(address => uint256[]) private _creatorTokens;

    /// @notice Fee required to mint a conversation NFT (in wei)
    uint256 public mintFee;

    /// @notice Next token ID to be minted
    uint256 private _nextTokenId;

    /// @notice Emitted when a conversation is minted
    event ConversationMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string encryptedCID,
        uint256 messageCount,
        uint256 modelId
    );

    /// @notice Emitted when the mint fee is updated
    event MintFeeUpdated(uint256 oldFee, uint256 newFee);

    constructor(uint256 _mintFee) ERC721("ChatVault", "CVLT") Ownable(msg.sender) {
        mintFee = _mintFee;
    }

    /// @notice Mint an encrypted conversation as an NFT
    /// @param encryptedCID IPFS CID of the AES-256-GCM encrypted conversation
    /// @param metadataHash keccak256 hash for integrity verification
    /// @param messageCount Number of messages in the conversation
    /// @param modelId On-chain model ID used for inference (0 if none)
    /// @return tokenId The newly minted token ID
    function mintConversation(
        string calldata encryptedCID,
        bytes32 metadataHash,
        uint256 messageCount,
        uint256 modelId
    ) external payable nonReentrant returns (uint256 tokenId) {
        require(bytes(encryptedCID).length > 0, "ChatVault: empty CID");
        require(messageCount > 0, "ChatVault: zero messages");
        require(msg.value >= mintFee, "ChatVault: insufficient fee");

        tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);

        _conversations[tokenId] = Conversation({
            encryptedCID: encryptedCID,
            metadataHash: metadataHash,
            messageCount: messageCount,
            modelId: modelId,
            mintedAt: block.timestamp,
            creator: msg.sender
        });

        _creatorTokens[msg.sender].push(tokenId);

        emit ConversationMinted(tokenId, msg.sender, encryptedCID, messageCount, modelId);
    }

    /// @notice Get conversation data for a token
    /// @param tokenId The token ID to query
    /// @return The Conversation struct
    function getConversation(uint256 tokenId) external view returns (Conversation memory) {
        _requireOwned(tokenId);
        return _conversations[tokenId];
    }

    /// @notice Get all token IDs created by a specific address
    /// @param creator The creator address to query
    /// @return Array of token IDs
    function getConversationsByCreator(address creator) external view returns (uint256[] memory) {
        return _creatorTokens[creator];
    }

    /// @notice Update the mint fee (owner only)
    /// @param newFee The new mint fee in wei
    function setMintFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = mintFee;
        mintFee = newFee;
        emit MintFeeUpdated(oldFee, newFee);
    }

    /// @notice Withdraw accumulated fees (owner only)
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "ChatVault: no balance");
        (bool success,) = payable(owner()).call{value: balance}("");
        require(success, "ChatVault: withdraw failed");
    }

    /// @notice Returns on-chain SVG metadata for the token
    /// @param tokenId The token ID
    /// @return Base64-encoded JSON metadata with embedded SVG
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        Conversation memory conv = _conversations[tokenId];

        string memory svg = _generateSVG(tokenId, conv);

        string memory part1 = string(
            abi.encodePacked(
                '{"name":"ChatVault #',
                tokenId.toString(),
                '","description":"Encrypted conversation with ',
                conv.messageCount.toString(),
                ' messages","image":"data:image/svg+xml;base64,',
                Base64.encode(bytes(svg))
            )
        );

        string memory part2 = string(
            abi.encodePacked(
                '","attributes":[{"trait_type":"Messages","value":',
                conv.messageCount.toString(),
                '},{"trait_type":"Model ID","value":"',
                conv.modelId.toString(),
                '"},{"trait_type":"Creator","display_type":"address","value":"',
                Strings.toHexString(uint160(conv.creator), 20),
                '"}]}'
            )
        );

        string memory json = string(abi.encodePacked(part1, part2));
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    // ─── Internal SVG Generation ─────────────────────────────────────

    function _generateSVG(uint256 tokenId, Conversation memory conv) internal pure returns (string memory) {
        string memory accent = _accentColor(tokenId);
        string memory truncCID = _truncateCID(conv.encryptedCID);

        return string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" style="background:#0a0a1a">',
                '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">',
                '<stop offset="0%" stop-color="#0f0f23"/><stop offset="100%" stop-color="#1a1a2e"/></linearGradient></defs>',
                '<rect width="400" height="500" fill="url(#bg)" rx="16"/>',
                '<rect x="0" y="0" width="400" height="6" fill="',
                accent,
                '" rx="3"/>',
                _generateChatBubbles(accent, conv.messageCount),
                _generateMetadata(tokenId, truncCID, conv, accent),
                '</svg>'
            )
        );
    }

    function _generateChatBubbles(string memory accent, uint256 messageCount) internal pure returns (string memory) {
        string memory bubbleShape = string(
            abi.encodePacked(
                '<g transform="translate(160,60)">',
                '<rect x="0" y="0" width="80" height="60" rx="12" fill="',
                accent,
                '" opacity="0.2"/>',
                '<rect x="4" y="4" width="72" height="52" rx="10" fill="none" stroke="',
                accent,
                '" stroke-width="2"/>'
            )
        );

        string memory dots = string(
            abi.encodePacked(
                '<circle cx="25" cy="30" r="4" fill="', accent, '"/>',
                '<circle cx="40" cy="30" r="4" fill="', accent, '"/>',
                '<circle cx="55" cy="30" r="4" fill="', accent, '"/>'
            )
        );

        string memory tail = string(
            abi.encodePacked(
                '<polygon points="20,52 30,52 15,68" fill="', accent, '" opacity="0.2"/>',
                '</g>',
                '<text x="200" y="150" text-anchor="middle" fill="white" font-size="14" font-family="monospace">',
                messageCount.toString(),
                ' messages</text>'
            )
        );

        return string(abi.encodePacked(bubbleShape, dots, tail));
    }

    function _generateMetadata(
        uint256 tokenId,
        string memory truncCID,
        Conversation memory conv,
        string memory accent
    ) internal pure returns (string memory) {
        string memory header = string(
            abi.encodePacked(
                '<text x="200" y="200" text-anchor="middle" fill="white" font-size="22" font-weight="bold" font-family="sans-serif">ChatVault #',
                tokenId.toString(),
                '</text>',
                '<rect x="40" y="230" width="320" height="1" fill="#374151"/>'
            )
        );

        string memory cidSection = string(
            abi.encodePacked(
                '<text x="60" y="270" fill="#9ca3af" font-size="12" font-family="monospace">ENCRYPTED CID</text>',
                '<text x="60" y="290" fill="white" font-size="13" font-family="monospace">', truncCID, '</text>'
            )
        );

        string memory modelSection = string(
            abi.encodePacked(
                '<text x="60" y="330" fill="#9ca3af" font-size="12" font-family="monospace">MODEL</text>',
                '<text x="60" y="350" fill="white" font-size="13" font-family="monospace">ID: ',
                conv.modelId.toString(),
                '</text>'
            )
        );

        string memory badge = string(
            abi.encodePacked(
                '<rect x="130" y="420" width="140" height="32" rx="16" fill="', accent, '" opacity="0.15"/>',
                '<text x="200" y="441" text-anchor="middle" fill="', accent,
                '" font-size="12" font-weight="bold" font-family="sans-serif">ENCRYPTED</text>'
            )
        );

        return string(abi.encodePacked(header, cidSection, modelSection, badge));
    }

    function _accentColor(uint256 tokenId) internal pure returns (string memory) {
        uint256 hue = (tokenId * 47 + 180) % 360;
        return string(abi.encodePacked("hsl(", hue.toString(), ",70%,60%)"));
    }

    function _truncateCID(string memory cid) internal pure returns (string memory) {
        bytes memory b = bytes(cid);
        if (b.length <= 16) return cid;

        bytes memory result = new bytes(15); // 8 + "..." + 4
        for (uint256 i = 0; i < 8; i++) {
            result[i] = b[i];
        }
        result[8] = '.';
        result[9] = '.';
        result[10] = '.';
        for (uint256 i = 0; i < 4; i++) {
            result[11 + i] = b[b.length - 4 + i];
        }
        return string(result);
    }
}
