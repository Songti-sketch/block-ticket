# Block Ticket - Anti-Scalping MVP

Block Ticket is a Web3 MVP that pairs a Next.js marketplace UI with an ERC-721 smart contract to reduce ticket scalping. Organizers mint NFT tickets, and every on-chain resale is restricted by a hard maximum price.

## Core Mechanism

Each ticket is minted with an immutable `originalPrice`.

- The organizer mints the ticket and stores its original face value on-chain.
- Ticket holders can list a resale only when `newPrice <= originalPrice * 110%`.
- Any resale attempt above that threshold reverts with `Price exceeds scalping cap`.
- The frontend mirrors the same 110% cap and shows a red warning before the user submits.

## Tech Stack

- Next.js 16 with App Router and Tailwind CSS
- TypeScript for the frontend and Hardhat config
- Hardhat 3 with Ethers.js
- OpenZeppelin ERC-721 contracts
- Mocha + Chai contract tests

## Run Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Compile the smart contract:

   ```bash
   npm run contracts:compile
   ```

3. Run the contract tests:

   ```bash
   npm run contracts:test
   ```

4. Start a local Hardhat node if you want a separate chain process:

   ```bash
   npx hardhat node
   ```

5. Deploy the contract locally:

   ```bash
   npm run contracts:deploy
   ```

6. Start the frontend:

   ```bash
   npm run dev
   ```

7. Open `http://localhost:3000` to view the mock marketplace UI.

## Included Features

- ERC-721 ticket minting with immutable original pricing
- Resale listing flow capped at 110% of face value
- Automated tests for minting, allowed resale, and blocked scalping
- Dark-mode glassmorphism marketplace UI with a resale warning modal
