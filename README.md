# Block Ticket

Block Ticket is a ticketing demo focused on anti-scalping rules and operational clarity. The current delivery version does not depend on MetaMask for the main flow. Instead, it uses shared virtual accounts and a local demo ledger so reviewers can see a complete transaction loop without wallet setup.

## What the current version demonstrates

- A ticket marketplace page at `/` for the user-facing flow
- A back-office operations page at `/admin`
- A 110% resale cap based on the ticket's original price
- Virtual-account settlement after the user inputs an amount and submits
- Immediate sync between frontend cards, backend ledger records, and account balances
- Ticket issuance and check-in flows for admin-side operations

## Product flow

1. On the marketplace page, select a ticket and open the settlement panel.
2. Choose a buyer virtual account.
3. Enter a settlement amount that does not exceed the cap.
4. Submit the simulated settlement.
5. The system updates:
   - ticket owner
   - current price
   - listing state
   - recent activity feed
   - virtual account balances
6. Open `/admin` to verify the same changes in the operations view.

## Pages

### `/`

The homepage is the user-facing marketplace.

- Shows ticket inventory, active listings, checked-in tickets, and settled volume
- Displays each ticket's owner, original price, current price, and capped maximum
- Lets the reviewer simulate a resale by entering an amount directly
- Writes the result into the shared demo ledger

### `/admin`

The admin page is the operations console.

- Issues new tickets into the shared ledger
- Marks tickets as used for check-in
- Shows virtual account balances
- Shows operational ticket status
- Lists recent backend ledger entries
- Includes a reset action for the demo dataset

## Data model

The current app uses a local shared ledger stored in `localStorage`.

- Source: [src/lib/demo-ledger.ts](./src/lib/demo-ledger.ts)
- Persistence: browser `localStorage`
- Sync: custom browser event plus `storage` listener

This means:

- the demo works without blockchain or wallet setup
- page refreshes keep the current state
- homepage and admin page stay in sync in the same browser

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the app:

   ```bash
   npm run dev
   ```

3. Open:

   ```text
   http://localhost:3000/
   http://localhost:3000/admin
   ```

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Build the static production output |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run contracts:compile` | Compile the optional smart contract code |
| `npm run contracts:test` | Run the optional contract tests |
| `npm run contracts:deploy` | Deploy the optional contract locally |
| `npm run contracts:deploy:sepolia` | Deploy the optional contract to Sepolia |

## About the blockchain files

The repository still includes the earlier smart-contract prototype:

- `contracts/TicketNFT.sol`
- `test/TicketNFT.js`
- `scripts/deploy.ts`
- `src/lib/block-ticket.ts`

These files are retained for future extension, but the current delivery flow does not require:

- MetaMask
- RPC configuration
- a deployed contract
- on-chain reads or writes

## Static export / GitHub Pages

The project is configured for static export.

- `next.config.ts` uses `output: "export"`
- image optimization is disabled for static hosting
- the repository subpath is handled automatically in GitHub Actions mode

Local verification:

```bash
GITHUB_ACTIONS=true GITHUB_REPOSITORY=Songti-sketch/block-ticket npm run build
```

## Validation status

The following checks were run on the current delivery version:

| Check | Command | Result |
| --- | --- | --- |
| Lint | `npm run lint` | Pass |
| Production build | `npm run build` | Pass |

## Suggested demo order

1. Open `/` and explain the marketplace overview cards.
2. Select a listed ticket and open the settlement panel.
3. Enter a compliant amount and submit.
4. Show the owner, price, activity feed, and balances updating.
5. Open `/admin` and show the same record in the ledger feed.
6. Issue a new ticket from `/admin`.
7. Return to `/` and show that the marketplace has synced.
8. Mark a ticket as used from `/admin`.
9. Return to `/` and show that checked-in tickets can no longer be transferred.

## Notes before committing

- The README now matches the current virtual-account delivery flow.
- No `.env.example` is required for the current demo.
- If you later switch back to the blockchain flow, update this README again to avoid drift.
