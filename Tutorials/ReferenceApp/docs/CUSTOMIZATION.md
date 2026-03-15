# Customization Guide

This reference dApp is designed as a starting template. Here's how to customize it for your own use case.

## Modifying the Contract

### Adding New Fields to ModelInfo

1. Edit `contracts/src/ModelNFT.sol`:
   - Add your field to the `ModelInfo` struct
   - Add a parameter to `mintModel()`
   - Update the `_models[tokenId]` assignment
   - Update `_generateSVG()` to display the new field
   - Update `tokenURI()` JSON to include the new attribute

2. Update `contracts/test/ModelNFT.t.sol` with new test cases

3. Rebuild: `cd contracts && forge build && forge test`

4. Update the frontend ABI in `frontend/src/config/abi.ts`

### Changing the SVG Design

The SVG is generated in `_generateSVG()` in `ModelNFT.sol`. Key customization points:

- **Colors**: Modify `_accentColor()` to change the color derivation
- **Layout**: Adjust the SVG viewBox, element positions, and font sizes
- **Content**: Add/remove text elements or shapes

### Adding Access Control

To restrict minting to specific addresses:

```solidity
mapping(address => bool) public allowlisted;

modifier onlyAllowlisted() {
    require(allowlisted[msg.sender], "Not allowlisted");
    _;
}

function mintModel(...) external payable onlyAllowlisted { ... }
function setAllowlisted(address addr, bool allowed) external onlyOwner { ... }
```

## Modifying the Frontend

### Changing the Network

Edit `frontend/src/config/network.ts`:
- Update `chainId`, `rpcUrl`, and `nativeCurrency` for your target network
- Update `MODEL_NFT_ADDRESS` with your deployed contract address

### Adding New Pages

1. Create a new page component in `frontend/src/pages/`
2. Add a route in `frontend/src/App.tsx`
3. Add a nav link in `frontend/src/components/Layout.tsx`

### Changing the Design

All design tokens are in `frontend/src/styles/global.css`. Modify the `:root` CSS variables to change:
- Color scheme (dark/light)
- Spacing scale
- Typography
- Border radius

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RPC_URL` | `http://localhost:8545` | Citrate RPC endpoint (contracts) |
| `PRIVATE_KEY` | Hardhat #0 | Deployer private key (contracts) |
| `MINT_FEE` | `10000000000000000` (0.01 SALT) | Initial mint fee in wei |

## Deployment

### To Citrate Testnet

```bash
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url https://testnet.citrate.ai \
  --private-key $YOUR_KEY \
  --broadcast
```

Then update `MODEL_NFT_ADDRESS` in the frontend config.

### Frontend to Static Hosting

```bash
cd frontend
npm run build
# Deploy dist/ to Vercel, Netlify, or any static host
```
