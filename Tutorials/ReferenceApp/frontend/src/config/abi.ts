/**
 * ModelNFT contract ABI in viem-compatible JSON format.
 * Regenerate from Foundry output: `cat out/ModelNFT.sol/ModelNFT.json | jq '.abi'`
 */
export const MODEL_NFT_ABI = [
  {
    type: 'function',
    name: 'mintModel',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'framework', type: 'string' },
      { name: 'ipfsCID', type: 'string' },
      { name: 'modelHash', type: 'bytes32' },
      { name: 'sizeBytes', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'getModelInfo',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'name', type: 'string' },
          { name: 'framework', type: 'string' },
          { name: 'ipfsCID', type: 'string' },
          { name: 'modelHash', type: 'bytes32' },
          { name: 'sizeBytes', type: 'uint256' },
          { name: 'creator', type: 'address' },
          { name: 'createdAt', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getModelsByCreator',
    inputs: [{ name: 'creator', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'tokenURI',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'tokenByIndex',
    inputs: [{ name: 'index', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'mintFee',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'ownerOf',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'ModelMinted',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'ipfsCID', type: 'string', indexed: false },
    ],
  },
] as const;
