# Block Ticket - Anti-Scalping MVP

Block Ticket is a Web3 MVP that pairs a Next.js marketplace UI with an ERC-721 smart contract to reduce ticket scalping. Organizers mint NFT tickets, every on-chain resale is restricted by a hard maximum price, and the admin console can now submit real transactions and read back the resulting event history from chain.

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

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the public chain configuration before using the on-chain admin console.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed `TicketNFT` contract address shown in the admin console |
| `NEXT_PUBLIC_CHAIN_ID` | Wallet chain ID expected by the app, e.g. `11155111` for Sepolia |
| `NEXT_PUBLIC_NETWORK_NAME` | Human-readable network label shown in the UI |
| `NEXT_PUBLIC_RPC_URL` | Read-only RPC endpoint used to load owner data and event logs |
| `NEXT_PUBLIC_EXPLORER_TX_BASE_URL` | Explorer transaction prefix, e.g. `https://sepolia.etherscan.io/tx` |
| `NEXT_PUBLIC_CONTRACT_DEPLOY_BLOCK` | Optional starting block for faster event queries |
| `SEPOLIA_RPC_URL` | Hardhat deploy RPC endpoint for testnet deployment |
| `DEPLOYER_PRIVATE_KEY` | Organizer wallet private key used by Hardhat deploy scripts |
| `SEED_DEMO_TICKET` | Optional `true` flag to mint one seed ticket immediately after deploy |

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

6. Copy `.env.example` to `.env.local` if you want `/admin` to load a deployed contract.

7. Start the frontend:

   ```bash
   npm run dev
   ```

8. Open `http://localhost:3000` to view the marketplace UI and `http://localhost:3000/admin` to operate the real admin console.

## Deploy to Sepolia for a Live On-Chain Demo

1. Fill in `SEPOLIA_RPC_URL` and `DEPLOYER_PRIVATE_KEY`.
2. Deploy the contract:

   ```bash
   npm run contracts:deploy:sepolia
   ```

3. Copy the printed `NEXT_PUBLIC_CONTRACT_ADDRESS` and `NEXT_PUBLIC_CHAIN_ID` values into `.env.local`.
4. Add:

   ```bash
   NEXT_PUBLIC_NETWORK_NAME=Sepolia
   NEXT_PUBLIC_EXPLORER_TX_BASE_URL=https://sepolia.etherscan.io/tx
   ```

5. Restart the frontend and open `/admin`.
6. Connect the organizer wallet in MetaMask.
7. Submit a mint or `markTicketUsed` transaction.
8. Use the returned transaction hash to open Sepolia Etherscan and prove the transaction is on-chain.

## Deploy to GitHub Pages

This project is configured for static export deployment to GitHub Pages.

### What is configured

- `next.config.ts` uses `output: "export"` for static generation.
- Image handling is switched to `unoptimized` so local assets work in static hosting.
- A GitHub Actions workflow publishes the `out/` directory to Pages on every push to `main`.
- When deployed from GitHub Actions, the app automatically uses the repository subpath, e.g. `/block-ticket`.

### One-time GitHub setup

1. Open the GitHub repository settings.
2. Go to `Settings` → `Pages`.
3. Under `Build and deployment`, choose `GitHub Actions` as the source.
4. Push the latest code to `main`.
5. Wait for the `Deploy to GitHub Pages` workflow to finish.

### Expected Pages URL

If the repository is `https://github.com/Songti-sketch/block-ticket`, the published site URL should be:

```text
https://songti-sketch.github.io/block-ticket/
```

### Local verification for Pages mode

To verify the same export behavior locally, run:

```bash
GITHUB_ACTIONS=true GITHUB_REPOSITORY=Songti-sketch/block-ticket npm run build
```

The static files will be generated in `out/`.

## Included Features

- ERC-721 ticket minting with immutable original pricing
- Resale listing flow capped at 110% of face value
- Used-ticket lock that prevents relisting or transfer after check-in
- Admin console for wallet-based minting, ticket check-in, and on-chain event history
- Automated tests for minting, allowed resale, blocked scalping, and used-ticket restrictions
- Dark-mode glassmorphism marketplace UI with a resale warning modal

## Page Walkthrough

The home page at `/` is organized into several presentation and workflow zones so a reviewer can understand both the fan experience and the anti-scalping logic at a glance.

### 1. Hero Header

- Establishes the product value proposition: trusted NFT ticket resale with a hard 110% cap.
- Displays the connected wallet badge and the active resale rule.
- Surfaces top-line KPIs such as live listings, Greater China cases, current selected cap, and validator refresh interval.

### 2. Marketplace Cards

- Each ticket card presents the concert artwork, event metadata, venue, seat, owner, and listing state.
- The primary pricing block compares:
  - `Original Price`
  - `Resale Cap`
  - `Current Listing`
- A progress bar visualizes how close the current price is to the 110% limit.
- The card supports a flip interaction so the back side can reveal provenance and entry credentials.

### 3. Provenance Back Side

- Shows simplified transaction history for each NFT ticket.
- Highlights mint source, resale history, and rule/ownership verification milestones.
- Includes an entry-pass style QR tile to imply portable validator-ready credentials.

### 4. Resale Panel

- Acts as the main fan-side pricing workflow for the selected ticket.
- Restates original price, capped maximum, and current listing side by side.
- Includes a live progress indicator driven by the entered resale price.
- Disables the submit button when the input exceeds the allowed threshold.
- Shows a Chinese warning message when the entered price breaks protocol rules.

### 5. Validator Portal

- Represents the venue-side check-in experience.
- Generates a rolling signature seed based on token ID, owner, and time window.
- Refreshes the visual credential every 30 seconds to reduce screenshot abuse.
- Lists the key conditions a validator must verify before check-in is accepted.

### 6. Concert Dataset

- Includes international artists and Greater China examples.
- Uses local artist assets for:
  - `public/artists/may.jpeg`
  - `public/artists/easonChen.jpg`
- Demonstrates how the same pricing and validation rules apply across markets.

## Admin Console Walkthrough

The admin page at `/admin` is the operational view for live demos. It is designed to prove that the platform is not just a static interface.

### 1. Contract Status

- Shows the configured contract address, target network, detected chain ID, and current organizer wallet.
- Flags a network mismatch before the user submits a transaction.
- States the exact proof flow from wallet signature to block explorer.

### 2. Admin Actions

- `Mint ticket` sends a real `mintTicket(...)` transaction from the connected organizer wallet.
- `Mark ticket used` sends a real `markTicketUsed(tokenId)` transaction and freezes later transfer attempts.
- Both actions surface transaction lifecycle states: awaiting wallet, pending, confirmed, or failed.

### 3. Transaction State Panel

- Displays the latest submitted action, transaction hash, and mined block number.
- Provides a direct explorer link so a reviewer can verify the same hash outside the application.
- Keeps failure messages visible when the wallet is wrong, the network is wrong, or the transaction reverts.

### 4. Recent On-Chain Activity

- Reads `TicketMinted`, `TicketListed`, `TicketResold`, `ResaleCancelled`, and `TicketUsed` events directly from the configured contract.
- Sorts them by block height so the newest proof appears first.
- Shows both the semantic event description and the raw transaction hash.

### 5. On-Chain Ticket Inventory

- Reads the latest minted token IDs from `TicketMinted` events and then queries current contract state for each ticket.
- Displays token ID, event name, seat, current owner, original price, current price, resale cap, and used/listed state.
- Gives the demo a visible before/after result: after minting or check-in, the inventory cards change immediately after refresh.

### 6. Setup Checklist

- Lists the exact prerequisites for the live demo: deployed contract, populated `.env.local`, and organizer wallet access.
- Lets a reviewer understand what must be configured before expecting on-chain writes from the admin page.

## Test Results

The following checks were run after the latest admin-console update:

| Check | Command | Result | Key Output |
| --- | --- | --- | --- |
| Contract tests | `env HOME=/tmp/hardhat-home npm run contracts:test` | Blocked in current sandbox | Hardhat now needs an online compiler download; rerun in a network-enabled shell |
| Lint | `npm run lint` | Pass | No lint errors |
| Production build | `npm run build` | Pass | Static `/` and `/admin` pages generated successfully |
| Pages export build | `GITHUB_ACTIONS=true GITHUB_REPOSITORY=Songti-sketch/block-ticket npm run build` | Pass | Verifies static export under `/block-ticket/` |

## 中文说明

下面是面向中文读者的页面说明，方便快速理解每个板块的作用。

### 页面结构与功能

#### 1. 顶部主视觉区

- 用来说明产品定位：基于区块链/NFT 的防黄牛票务系统。
- 展示已连接钱包和 `110%` 转售上限规则，帮助用户立即理解平台约束。
- 通过四个指标卡快速展示当前页面状态，包括在售门票数量、中华区案例数量、当前选中门票上限价格，以及核验动态码刷新倒计时。

#### 2. 门票市场卡片区

- 每张卡片展示一场演唱会的核心信息：歌手、场馆、座位、持有人、原始票价和当前挂牌价。
- 价格区是页面最核心的信任设计，明确告诉用户：
  - 原价是多少
  - 协议允许的最高转售价是多少
  - 当前挂牌价距离上限还有多少空间
- 进度条用于直观表达“当前价格距离 110% 上限还有多远”，降低用户理解成本。

#### 3. 翻转背面 / 流转记录区

- 用户悬停卡片后可以看到背面内容。
- 背面主要展示该门票的流转记录（Provenance），包括铸造来源、历史转售、规则检查或所有权验证状态。
- 同时展示一个入场凭证样式的二维码区域，用来模拟后续真实核验流程。

#### 4. 转售操作面板

- 右侧面板对应当前选中的门票，是用户设置转售价的主要区域。
- 面板会再次显示原价、协议上限价和当前挂牌价，避免用户在输入时丢失上下文。
- 当输入价格超过 `110%` 上限时：
  - 提交按钮会被禁用
  - 页面会显示中文提示：`根据 Block Ticket 协议，转售价不得超过原价的 110% 以保护粉丝权益。`
- 这样即使用户不懂智能合约，也能在前端提前理解系统约束。

#### 5. 核验员入口（Validator Portal）

- 这个板块模拟演唱会现场或验票口使用的核验视角。
- 页面会生成一个基于时间窗口动态变化的签名种子和图形码，用来表达“动态二维码/动态凭证”的设计方向。
- 核验员可以依据页面中的检查清单确认：
  - 当前钱包是否仍然持有门票
  - 门票是否未核销、可转让
  - 当前动态码是否还在有效时间窗口内

#### 6. 中华区案例

- 页面中已加入中华区演唱会案例，而不再只展示国外乐队。
- 当前包含：
  - 五月天 `Just Love It 银河特别场`
  - 陈奕迅 `Fear and Dreams Final Encore`
- 对应图片资源已经放入：
  - `public/artists/may.jpeg`
  - `public/artists/easonChen.jpg`

#### 7. 管理后台 / 链上演示页

- `/admin` 页面是本次升级的重点，用来证明系统并不只是静态网页。
- 管理员连接 MetaMask 后，可以直接发起两类真实链上操作：
  - `Mint ticket`
  - `Mark ticket used`
- 每次提交后，页面都会展示：
  - 交易状态
  - `transaction hash`
  - `block number`
  - 区块浏览器跳转链接
- 右侧的交易状态面板和下方的事件列表一起构成“链上证明”：
- 中间新增的链上门票清单会读取合约当前状态，展示每张票的：
  - tokenId
  - event name
  - owner
  - original price / current price / resale cap
  - listed / used 状态
- 这样在操作后，不仅能看到交易 hash，还能直接看到该票在合约里的状态已经发生变化。
- 右侧的交易状态面板和下方的事件列表一起构成“链上证明”：
  - 面板展示刚刚发出的交易
  - 事件列表展示合约发出的 `TicketMinted` / `TicketUsed` 等事件
- 这样在答辩或演示时，可以完成“前端操作 → 钱包签名 → 交易上链 → 浏览器验证”的完整闭环。

### 建议演示流程

1. 打开 `/admin`
2. 连接管理员 MetaMask
3. 在 `Mint ticket` 中输入接收地址并提交
4. 等待交易确认，记录页面上的 `transaction hash`
5. 观察 `Recent on-chain activity` 新增 `Ticket minted`
6. 观察 `On-chain ticket inventory` 新增对应 token
7. 点击 `Open transaction in explorer`，在区块浏览器证明交易已上链
8. 再执行一次 `Mark ticket used`
9. 刷新后确认该 token 状态从 `Listed/Held` 变成 `Used`

### 测试结果记录表

| 测试项目 | 执行命令 | 结果 | 说明 |
| --- | --- | --- | --- |
| 合约逻辑测试 | `env HOME=/tmp/hardhat-home npm run contracts:test` | 当前沙箱受限 | Hardhat 在当前环境无法联网下载编译器；在正常联网终端中可复跑新增用例 |
| 代码检查 | `npm run lint` | 通过 | 前端组件与文档更新后无 lint 错误 |
| 生产构建 | `npm run build` | 通过 | 首页与 `/admin` 管理台均成功静态生成 |
| GitHub Pages 导出构建 | `GITHUB_ACTIONS=true GITHUB_REPOSITORY=Songti-sketch/block-ticket npm run build` | 通过 | 已验证仓库子路径 `/block-ticket/` 下的静态导出 |
