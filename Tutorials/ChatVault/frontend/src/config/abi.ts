/**
 * ChatVault contract ABI in viem-compatible JSON format.
 * Regenerate from Foundry output: `cat out/ChatVault.sol/ChatVault.json | jq '.abi'`
 */
export const CHATVAULT_ABI = [
  {
    type: 'function',
    name: 'mintConversation',
    inputs: [
      { name: 'encryptedCID', type: 'string' },
      { name: 'metadataHash', type: 'bytes32' },
      { name: 'messageCount', type: 'uint256' },
      { name: 'modelId', type: 'uint256' },
    ],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'getConversation',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'encryptedCID', type: 'string' },
          { name: 'metadataHash', type: 'bytes32' },
          { name: 'messageCount', type: 'uint256' },
          { name: 'modelId', type: 'uint256' },
          { name: 'mintedAt', type: 'uint256' },
          { name: 'creator', type: 'address' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getConversationsByCreator',
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
    name: 'ConversationMinted',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'encryptedCID', type: 'string', indexed: false },
      { name: 'messageCount', type: 'uint256', indexed: false },
      { name: 'modelId', type: 'uint256', indexed: false },
    ],
  },
] as const;
