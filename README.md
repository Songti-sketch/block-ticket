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

## Test Results

The following checks were run after the latest UI and documentation update:

| Check | Command | Result | Key Output |
| --- | --- | --- | --- |
| Contract tests | `npm run contracts:test` | Pass | `3 passing (3 mocha)` |
| Lint | `npm run lint` | Pass | No lint errors |
| Production build | `npm run build` | Pass | Static `/` page generated successfully |

## 中文说明

下面是面向中文读者的页面说明，方便演示、答辩或项目交接时快速理解每个板块的作用。

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

### 测试结果记录表

| 测试项目 | 执行命令 | 结果 | 说明 |
| --- | --- | --- | --- |
| 合约逻辑测试 | `npm run contracts:test` | 通过 | 共 3 项测试通过，覆盖铸造、105% 合法转售、115% 超限回退 |
| 代码检查 | `npm run lint` | 通过 | 前端组件与文档更新后无 lint 错误 |
| 生产构建 | `npm run build` | 通过 | 首页成功静态生成，可用于交付演示 |
