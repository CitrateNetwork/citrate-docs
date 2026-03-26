// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./KYCRegistry.sol";
import "./PatentTiers.sol";

/**
 * @title PatentNFT
 * @notice ERC-721 tokens representing patents on the Citrate blockchain.
 *         Each token stores on-chain metadata (title, IPFS CID, SHA-256 hash,
 *         category) and renders a fully on-chain SVG. Requires KYC verification
 *         and a SALT stake to mint.
 */
contract PatentNFT is ERC721Enumerable, Ownable, ReentrancyGuard {
    using Strings for uint256;
    using Strings for address;

    // -----------------------------------------------------------------------
    //  Types
    // -----------------------------------------------------------------------

    enum PatentCategory { UTILITY, DESIGN, PLANT, PROVISIONAL, SOFTWARE }

    struct PatentInfo {
        string title;
        string ipfsCID;           // IPFS manifest CID
        bytes32 contentHash;      // SHA-256 of patent documents
        uint256 sizeBytes;        // Total size of patent docs
        PatentCategory category;
        address inventor;         // Original minter
        uint256 createdAt;        // Block timestamp at mint
    }

    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    KYCRegistry public immutable kycRegistry;
    PatentTiers public immutable patentTiers;

    /// @notice SALT stake required to mint (~$5 USD equivalent).
    uint256 public mintStakeAmount;

    /// @notice Duration the stake is locked after minting.
    uint256 public constant STAKE_LOCK_DURATION = 90 days;

    uint256 private _nextTokenId = 1;

    /// @notice tokenId => patent metadata
    mapping(uint256 => PatentInfo) private _patents;

    /// @notice tokenId => stake info
    struct StakeInfo {
        uint256 amount;
        uint256 lockedUntil;
        bool refunded;
        bool burned;
    }
    mapping(uint256 => StakeInfo) public stakes;

    /// @notice inventor => their patent token IDs
    mapping(address => uint256[]) private _inventorPatents;

    /// @notice Address of the ServicePool for burned stakes
    address public servicePool;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    event PatentMinted(
        uint256 indexed tokenId,
        address indexed inventor,
        string title,
        string ipfsCID,
        PatentCategory category
    );
    event StakeLocked(uint256 indexed tokenId, address indexed staker, uint256 amount);
    event StakeRefunded(uint256 indexed tokenId, address indexed staker, uint256 amount);
    event StakeBurned(uint256 indexed tokenId, uint256 amount);
    event MintStakeUpdated(uint256 newAmount);

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    constructor(
        address _kycRegistry,
        address _patentTiers,
        address _servicePool,
        uint256 _mintStakeAmount
    ) ERC721("PatentMint", "PATENT") Ownable(msg.sender) {
        require(_kycRegistry != address(0), "PatentNFT: zero KYC");
        require(_patentTiers != address(0), "PatentNFT: zero tiers");
        kycRegistry = KYCRegistry(_kycRegistry);
        patentTiers = PatentTiers(_patentTiers);
        servicePool = _servicePool;
        mintStakeAmount = _mintStakeAmount;
    }

    // -----------------------------------------------------------------------
    //  Minting
    // -----------------------------------------------------------------------

    /**
     * @notice Mint a new patent NFT. Requires KYC, SALT stake, and valid inputs.
     */
    function mintPatent(
        string calldata title,
        string calldata ipfsCID,
        bytes32 contentHash,
        uint256 sizeBytes,
        PatentCategory category,
        PatentTiers.ProtectionTier tier,
        uint256 revShareBps
    ) external payable nonReentrant returns (uint256 tokenId) {
        // KYC gate
        require(
            kycRegistry.isVerified(msg.sender, KYCRegistry.VerificationLevel.INDIVIDUAL),
            "PatentNFT: KYC required"
        );

        // Input validation
        require(bytes(title).length > 0, "PatentNFT: empty title");
        require(bytes(ipfsCID).length > 0, "PatentNFT: empty CID");
        require(contentHash != bytes32(0), "PatentNFT: zero hash");

        // Stake
        require(msg.value >= mintStakeAmount, "PatentNFT: insufficient stake");

        tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);

        _patents[tokenId] = PatentInfo({
            title: title,
            ipfsCID: ipfsCID,
            contentHash: contentHash,
            sizeBytes: sizeBytes,
            category: category,
            inventor: msg.sender,
            createdAt: block.timestamp
        });

        _inventorPatents[msg.sender].push(tokenId);

        // Lock stake
        uint256 lockedUntil = block.timestamp + STAKE_LOCK_DURATION;
        stakes[tokenId] = StakeInfo({
            amount: mintStakeAmount,
            lockedUntil: lockedUntil,
            refunded: false,
            burned: false
        });

        // Refund excess
        if (msg.value > mintStakeAmount) {
            (bool ok, ) = msg.sender.call{value: msg.value - mintStakeAmount}("");
            require(ok, "PatentNFT: refund failed");
        }

        // Set tier
        patentTiers.setInitialTier(tokenId, tier, revShareBps);

        emit PatentMinted(tokenId, msg.sender, title, ipfsCID, category);
        emit StakeLocked(tokenId, msg.sender, mintStakeAmount);
    }

    // -----------------------------------------------------------------------
    //  Staking
    // -----------------------------------------------------------------------

    function refundStake(uint256 tokenId) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "PatentNFT: not owner");
        StakeInfo storage s = stakes[tokenId];
        require(!s.refunded && !s.burned, "PatentNFT: already settled");
        require(block.timestamp >= s.lockedUntil, "PatentNFT: still locked");

        s.refunded = true;
        (bool ok, ) = msg.sender.call{value: s.amount}("");
        require(ok, "PatentNFT: transfer failed");
        emit StakeRefunded(tokenId, msg.sender, s.amount);
    }

    function burnStake(uint256 tokenId) external onlyOwner {
        StakeInfo storage s = stakes[tokenId];
        require(!s.refunded && !s.burned, "PatentNFT: already settled");
        s.burned = true;
        require(servicePool != address(0), "PatentNFT: no service pool");
        (bool ok, ) = servicePool.call{value: s.amount}("");
        require(ok, "PatentNFT: transfer failed");
        emit StakeBurned(tokenId, s.amount);
    }

    // -----------------------------------------------------------------------
    //  Views
    // -----------------------------------------------------------------------

    function getPatentInfo(uint256 tokenId) external view returns (PatentInfo memory) {
        require(tokenId > 0 && tokenId < _nextTokenId, "PatentNFT: invalid token");
        return _patents[tokenId];
    }

    function getPatentsByInventor(address inventor) external view returns (uint256[] memory) {
        return _inventorPatents[inventor];
    }

    // -----------------------------------------------------------------------
    //  On-chain SVG metadata
    // -----------------------------------------------------------------------

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(tokenId > 0 && tokenId < _nextTokenId, "PatentNFT: invalid token");
        PatentInfo memory p = _patents[tokenId];

        string memory categoryStr = _categoryString(p.category);
        string memory svg = _generateSVG(tokenId, p);
        string memory svgBase64 = Base64.encode(bytes(svg));

        string memory json = string(abi.encodePacked(
            '{"name":"Patent #', tokenId.toString(),
            ' - ', p.title,
            '","description":"On-chain patent NFT on Citrate. Category: ', categoryStr,
            '","image":"data:image/svg+xml;base64,', svgBase64,
            '","attributes":[',
            '{"trait_type":"Category","value":"', categoryStr, '"},',
            '{"trait_type":"Inventor","value":"', Strings.toHexString(p.inventor), '"},',
            '{"trait_type":"Size","value":"', _formatSize(p.sizeBytes), '"},',
            '{"trait_type":"IPFS CID","value":"', _truncateCID(p.ipfsCID), '"}',
            ']}'
        ));

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    // -----------------------------------------------------------------------
    //  Admin
    // -----------------------------------------------------------------------

    function setMintStakeAmount(uint256 _amount) external onlyOwner {
        mintStakeAmount = _amount;
        emit MintStakeUpdated(_amount);
    }

    function setServicePool(address _pool) external onlyOwner {
        servicePool = _pool;
    }

    // -----------------------------------------------------------------------
    //  Internal SVG helpers
    // -----------------------------------------------------------------------

    function _generateSVG(uint256 tokenId, PatentInfo memory p) internal pure returns (string memory) {
        // Deterministic accent color from tokenId
        bytes32 seed = keccak256(abi.encodePacked(tokenId));
        uint256 hue = uint256(seed) % 360;

        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">',
            '<defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
            '<stop offset="0%" style="stop-color:#0a0a1a"/>',
            '<stop offset="100%" style="stop-color:#1a1a3e"/>',
            '</linearGradient></defs>',
            '<rect width="400" height="500" fill="url(#bg)" rx="16"/>',
            // Header
            '<text x="24" y="40" fill="hsl(', _uint2str(hue),
            ',70%,60%)" font-family="monospace" font-size="12" font-weight="bold">PATENT #',
            tokenId.toString(), '</text>',
            // Title
            '<text x="24" y="72" fill="#f9fafb" font-family="sans-serif" font-size="18" font-weight="bold">',
            _truncateTitle(p.title), '</text>',
            // Category badge
            '<rect x="24" y="88" width="100" height="24" rx="4" fill="hsl(',
            _uint2str(hue), ',70%,20%)"/>',
            '<text x="74" y="105" fill="hsl(', _uint2str(hue),
            ',70%,70%)" font-family="monospace" font-size="11" text-anchor="middle">',
            _categoryString(p.category), '</text>',
            // CID
            '<text x="24" y="160" fill="#6b7280" font-family="monospace" font-size="10">IPFS CID</text>',
            '<text x="24" y="178" fill="#9ca3af" font-family="monospace" font-size="12">',
            _truncateCID(p.ipfsCID), '</text>',
            // Size
            '<text x="24" y="220" fill="#6b7280" font-family="monospace" font-size="10">FILE SIZE</text>',
            '<text x="24" y="238" fill="#9ca3af" font-family="monospace" font-size="12">',
            _formatSize(p.sizeBytes), '</text>',
            // Inventor
            '<text x="24" y="280" fill="#6b7280" font-family="monospace" font-size="10">INVENTOR</text>',
            '<text x="24" y="298" fill="#9ca3af" font-family="monospace" font-size="10">',
            Strings.toHexString(p.inventor), '</text>',
            // Footer
            '<line x1="24" y1="440" x2="376" y2="440" stroke="#374151" stroke-width="1"/>',
            '<text x="200" y="470" fill="#4b5563" font-family="monospace" font-size="10" text-anchor="middle">PatentMint on Citrate</text>',
            '</svg>'
        ));
    }

    function _categoryString(PatentCategory c) internal pure returns (string memory) {
        if (c == PatentCategory.UTILITY) return "UTILITY";
        if (c == PatentCategory.DESIGN) return "DESIGN";
        if (c == PatentCategory.PLANT) return "PLANT";
        if (c == PatentCategory.PROVISIONAL) return "PROVISIONAL";
        return "SOFTWARE";
    }

    function _truncateCID(string memory cid) internal pure returns (string memory) {
        bytes memory b = bytes(cid);
        if (b.length <= 16) return cid;
        // First 8 ... last 4
        bytes memory result = new bytes(15);
        for (uint i = 0; i < 8; i++) result[i] = b[i];
        result[8] = ".";
        result[9] = ".";
        result[10] = ".";
        for (uint i = 0; i < 4; i++) result[11 + i] = b[b.length - 4 + i];
        return string(result);
    }

    function _truncateTitle(string memory title) internal pure returns (string memory) {
        bytes memory b = bytes(title);
        if (b.length <= 30) return title;
        bytes memory result = new bytes(33);
        for (uint i = 0; i < 30; i++) result[i] = b[i];
        result[30] = ".";
        result[31] = ".";
        result[32] = ".";
        return string(result);
    }

    function _formatSize(uint256 sizeBytes) internal pure returns (string memory) {
        if (sizeBytes >= 1_000_000_000) {
            return string(abi.encodePacked((sizeBytes / 1_000_000_000).toString(), " GB"));
        } else if (sizeBytes >= 1_000_000) {
            return string(abi.encodePacked((sizeBytes / 1_000_000).toString(), " MB"));
        } else if (sizeBytes >= 1_000) {
            return string(abi.encodePacked((sizeBytes / 1_000).toString(), " KB"));
        }
        return string(abi.encodePacked(sizeBytes.toString(), " B"));
    }

    function _uint2str(uint256 v) internal pure returns (string memory) {
        return v.toString();
    }
}
