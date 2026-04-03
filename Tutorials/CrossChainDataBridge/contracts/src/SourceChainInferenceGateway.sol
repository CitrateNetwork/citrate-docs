// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

library ECDSA {
    bytes32 private constant SECP256K1N_HALF =
        0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0;

    function recover(bytes32 hash, bytes memory signature) internal pure returns (address) {
        require(signature.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly ("memory-safe") {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }

        if (v < 27) {
            v += 27;
        }

        require(v == 27 || v == 28, "Invalid signature v");
        require(uint256(s) <= uint256(SECP256K1N_HALF), "Invalid signature s");

        address signer = ecrecover(hash, v, r, s);
        require(signer != address(0), "Invalid signature");

        return signer;
    }
}

abstract contract EIP712 {
    bytes32 private immutable _hashedName;
    bytes32 private immutable _hashedVersion;
    bytes32 private immutable _typeHash;
    uint256 private immutable _cachedChainId;
    bytes32 private immutable _cachedDomainSeparator;

    constructor(string memory name, string memory version) {
        _hashedName = keccak256(bytes(name));
        _hashedVersion = keccak256(bytes(version));
        _typeHash = keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );
        _cachedChainId = block.chainid;
        _cachedDomainSeparator = _buildDomainSeparator();
    }

    function _domainSeparatorV4() internal view returns (bytes32) {
        if (block.chainid == _cachedChainId) {
            return _cachedDomainSeparator;
        }
        return _buildDomainSeparator();
    }

    function _buildDomainSeparator() private view returns (bytes32) {
        return keccak256(
            abi.encode(
                _typeHash,
                _hashedName,
                _hashedVersion,
                block.chainid,
                address(this)
            )
        );
    }

    function _hashTypedDataV4(bytes32 structHash) internal view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", _domainSeparatorV4(), structHash));
    }
}

contract SourceChainInferenceGateway is EIP712 {
    enum RequestStatus {
        Pending,
        Completed,
        Failed,
        Cancelled
    }

    struct Request {
        address requester;
        bytes32 modelHash;
        bytes32 inputHash;
        bytes inputData;
        uint256 maxPrice;
        uint256 deadline;
        address callbackTarget;
        bytes4 callbackSelector;
        RequestStatus status;
        uint256 citrateRequestId;
        bytes32 outputHash;
        bytes outputData;
    }

    struct Attestation {
        bytes32 sourceRequestId;
        uint256 citrateRequestId;
        bytes32 modelHash;
        bytes32 inputHash;
        bytes32 outputHash;
        bytes32 citrateBlockHash;
        uint64 citrateBlockNumber;
        uint64 citrateChainId;
    }

    bytes32 public constant ATTESTATION_TYPEHASH = keccak256(
        "Attestation(bytes32 sourceRequestId,uint256 citrateRequestId,bytes32 modelHash,bytes32 inputHash,bytes32 outputHash,bytes32 citrateBlockHash,uint64 citrateBlockNumber,uint64 citrateChainId)"
    );

    event InferenceRequested(
        bytes32 indexed requestId,
        address indexed requester,
        bytes32 indexed modelHash,
        bytes32 inputHash,
        uint256 maxPrice,
        uint256 deadline,
        address callbackTarget,
        bytes4 callbackSelector
    );

    event InferenceFinalized(
        bytes32 indexed requestId,
        bytes32 outputHash,
        uint256 citrateRequestId
    );

    event InferenceFailed(
        bytes32 indexed requestId,
        uint256 citrateRequestId
    );

    event CallbackFailed(bytes32 indexed requestId, address indexed callbackTarget);

    event RelayerUpdated(address indexed relayer, bool active);
    event QuorumUpdated(uint256 oldQuorum, uint256 newQuorum);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    address public owner;
    uint64 public immutable citrateChainId;
    uint256 public quorum;

    mapping(bytes32 => Request) private _requests;
    mapping(address => uint256) public requesterNonces;
    mapping(address => bool) public relayers;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(uint64 _citrateChainId, uint256 _quorum)
        EIP712("CitrateCrossChainInference", "1")
    {
        require(_quorum > 0, "Quorum must be > 0");
        owner = msg.sender;
        citrateChainId = _citrateChainId;
        quorum = _quorum;
    }

    function setRelayer(address relayer, bool active) external onlyOwner {
        relayers[relayer] = active;
        emit RelayerUpdated(relayer, active);
    }

    function setQuorum(uint256 newQuorum) external onlyOwner {
        require(newQuorum > 0, "Quorum must be > 0");
        uint256 oldQuorum = quorum;
        quorum = newQuorum;
        emit QuorumUpdated(oldQuorum, newQuorum);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Owner cannot be zero");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function requestInference(
        bytes32 modelHash,
        bytes calldata inputData,
        uint256 maxPrice,
        uint256 deadline,
        address callbackTarget,
        bytes4 callbackSelector
    ) external returns (bytes32 requestId) {
        require(deadline > block.timestamp, "Deadline passed");
        require(inputData.length > 0, "Input required");

        if (callbackTarget == address(0)) {
            require(callbackSelector == bytes4(0), "Selector must be empty");
        } else {
            require(callbackSelector != bytes4(0), "Selector required");
        }

        bytes32 inputHash = keccak256(inputData);
        uint256 nonce = requesterNonces[msg.sender];
        requesterNonces[msg.sender] = nonce + 1;

        requestId = computeRequestId(msg.sender, nonce, modelHash, inputHash, deadline);

        Request storage req = _requests[requestId];
        req.requester = msg.sender;
        req.modelHash = modelHash;
        req.inputHash = inputHash;
        req.inputData = inputData;
        req.maxPrice = maxPrice;
        req.deadline = deadline;
        req.callbackTarget = callbackTarget;
        req.callbackSelector = callbackSelector;
        req.status = RequestStatus.Pending;

        emit InferenceRequested(
            requestId,
            msg.sender,
            modelHash,
            inputHash,
            maxPrice,
            deadline,
            callbackTarget,
            callbackSelector
        );
    }

    function finalizeInferenceTyped(
        bytes32 requestId,
        uint256 citrateRequestId,
        bytes calldata outputData,
        Attestation[] calldata attestations,
        bytes[] calldata signatures
    ) external {
        Request storage req = _requests[requestId];
        require(req.status == RequestStatus.Pending, "Invalid status");
        require(req.deadline >= block.timestamp, "Deadline exceeded");
        require(outputData.length > 0, "Output required");

        bytes32 outputHash = keccak256(outputData);

        _validateAttestations(
            requestId,
            citrateRequestId,
            req.modelHash,
            req.inputHash,
            outputHash,
            attestations,
            signatures
        );

        req.status = RequestStatus.Completed;
        req.citrateRequestId = citrateRequestId;
        req.outputHash = outputHash;
        req.outputData = outputData;

        emit InferenceFinalized(requestId, outputHash, citrateRequestId);

        if (req.callbackTarget != address(0) && req.callbackSelector != bytes4(0)) {
            bytes memory payload = abi.encodeWithSelector(
                req.callbackSelector,
                requestId,
                outputData
            );
            (bool success, ) = req.callbackTarget.call(payload);
            if (!success) {
                emit CallbackFailed(requestId, req.callbackTarget);
            }
        }
    }

    function markFailedTyped(
        bytes32 requestId,
        uint256 citrateRequestId,
        Attestation[] calldata attestations,
        bytes[] calldata signatures
    ) external {
        Request storage req = _requests[requestId];
        require(req.status == RequestStatus.Pending, "Invalid status");

        _validateAttestations(
            requestId,
            citrateRequestId,
            req.modelHash,
            req.inputHash,
            bytes32(0),
            attestations,
            signatures
        );

        req.status = RequestStatus.Failed;
        req.citrateRequestId = citrateRequestId;

        emit InferenceFailed(requestId, citrateRequestId);
    }

    function getRequest(bytes32 requestId)
        external
        view
        returns (
            address requester,
            bytes32 modelHash,
            bytes32 inputHash,
            bytes memory inputData,
            uint256 maxPrice,
            uint256 deadline,
            address callbackTarget,
            bytes4 callbackSelector,
            RequestStatus status,
            uint256 citrateRequestId,
            bytes32 outputHash,
            bytes memory outputData
        )
    {
        Request storage req = _requests[requestId];
        return (
            req.requester,
            req.modelHash,
            req.inputHash,
            req.inputData,
            req.maxPrice,
            req.deadline,
            req.callbackTarget,
            req.callbackSelector,
            req.status,
            req.citrateRequestId,
            req.outputHash,
            req.outputData
        );
    }

    function computeRequestId(
        address requester,
        uint256 nonce,
        bytes32 modelHash,
        bytes32 inputHash,
        uint256 deadline
    ) public view returns (bytes32) {
        return keccak256(
            abi.encode(requester, nonce, modelHash, inputHash, deadline, block.chainid, address(this))
        );
    }

    function hashAttestation(Attestation memory a) public pure returns (bytes32) {
        return keccak256(
            abi.encode(
                ATTESTATION_TYPEHASH,
                a.sourceRequestId,
                a.citrateRequestId,
                a.modelHash,
                a.inputHash,
                a.outputHash,
                a.citrateBlockHash,
                a.citrateBlockNumber,
                a.citrateChainId
            )
        );
    }

    function _validateAttestations(
        bytes32 requestId,
        uint256 citrateRequestId,
        bytes32 modelHash,
        bytes32 inputHash,
        bytes32 outputHash,
        Attestation[] calldata attestations,
        bytes[] calldata signatures
    ) internal view {
        uint256 attestationCount = attestations.length;
        require(attestationCount == signatures.length, "Length mismatch");
        require(attestationCount >= quorum, "Insufficient attestations");

        address[] memory seen = new address[](attestationCount);
        uint256 uniqueCount = 0;

        for (uint256 i = 0; i < attestationCount; i++) {
            Attestation calldata a = attestations[i];
            _validateAttestationFields(a, requestId, citrateRequestId, modelHash, inputHash, outputHash);

            address signer = _recoverSigner(a, signatures[i]);
            require(relayers[signer], "Unauthorized relayer");
            _ensureUniqueSigner(seen, uniqueCount, signer);
            seen[uniqueCount] = signer;
            uniqueCount++;
        }

        require(uniqueCount >= quorum, "Quorum not met");
    }

    function _validateAttestationFields(
        Attestation calldata a,
        bytes32 requestId,
        uint256 citrateRequestId,
        bytes32 modelHash,
        bytes32 inputHash,
        bytes32 outputHash
    ) internal view {
        require(a.sourceRequestId == requestId, "Request mismatch");
        require(a.citrateRequestId == citrateRequestId, "Citrate request mismatch");
        require(a.modelHash == modelHash, "Model mismatch");
        require(a.inputHash == inputHash, "Input mismatch");
        require(a.outputHash == outputHash, "Output mismatch");
        require(a.citrateChainId == citrateChainId, "Chain mismatch");
        require(a.citrateBlockHash != bytes32(0), "Block hash required");
    }

    function _recoverSigner(Attestation calldata a, bytes calldata signature) internal view returns (address) {
        bytes32 digest = _hashTypedDataV4(hashAttestation(a));
        return ECDSA.recover(digest, signature);
    }

    function _ensureUniqueSigner(
        address[] memory seen,
        uint256 count,
        address signer
    ) internal pure {
        for (uint256 j = 0; j < count; j++) {
            require(seen[j] != signer, "Duplicate signer");
        }
    }
}
