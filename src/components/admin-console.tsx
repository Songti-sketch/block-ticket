"use client";

import Link from "next/link";
import { BrowserProvider, Contract, JsonRpcProvider, parseEther } from "ethers";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  blockTicketAbi,
  formatAddress,
  formatEthValue,
  formatTimestamp,
  getExplorerTransactionUrl,
  getPublicChainConfig,
} from "@/lib/block-ticket";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
      on?: (event: string, listener: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
    };
  }
}

type ActivityItem = {
  txHash: string;
  blockNumber: number;
  timestamp: string;
  title: string;
  detail: string;
  tokenId: string;
  explorerUrl: string;
};

type ChainTicketItem = {
  tokenId: string;
  eventName: string;
  seatLabel: string;
  originalPrice: string;
  currentPrice: string;
  resaleCap: string;
  owner: string;
  used: boolean;
  listed: boolean;
};

type NamedLog = {
  eventName: string;
  log: {
    args?: ArrayLike<unknown>;
    blockNumber: bigint | number;
    index?: bigint | number;
    transactionHash: string;
  };
};

type TransactionState = {
  status: "idle" | "awaiting_wallet" | "pending" | "confirmed" | "failed";
  action: string;
  hash: string;
  blockNumber: string;
  error: string;
  explorerUrl: string;
};

const chainConfig = getPublicChainConfig();

const initialTransactionState: TransactionState = {
  status: "idle",
  action: "",
  hash: "",
  blockNumber: "",
  error: "",
  explorerUrl: "",
};

const initialMintForm = {
  recipient: "",
  eventName: "Block Ticket Live Demo",
  seatLabel: "A-01",
  originalPrice: "0.25",
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected wallet or RPC error.";
}

function getStatusLabel(status: TransactionState["status"]) {
  switch (status) {
    case "awaiting_wallet":
      return "Awaiting wallet signature";
    case "pending":
      return "Transaction pending";
    case "confirmed":
      return "Transaction confirmed";
    case "failed":
      return "Transaction failed";
    default:
      return "Ready to submit";
  }
}

function hasEventArgs(
  log: unknown,
): log is {
  args: ArrayLike<unknown>;
  blockNumber: bigint | number;
  index?: bigint | number;
  transactionHash: string;
} {
  return typeof log === "object" && log !== null && "args" in log;
}

export function AdminConsole() {
  const [hasWallet, setHasWallet] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletChainId, setWalletChainId] = useState<number | null>(null);
  const [readChainId, setReadChainId] = useState<number | null>(null);
  const [contractOwner, setContractOwner] = useState("");
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [chainTickets, setChainTickets] = useState<ChainTicketItem[]>([]);
  const [transactionState, setTransactionState] = useState(initialTransactionState);
  const [pageError, setPageError] = useState("");
  const [mintForm, setMintForm] = useState(initialMintForm);
  const [usedTokenId, setUsedTokenId] = useState("");

  const contractConfigured = Boolean(chainConfig.contractAddress);
  const chainMismatch =
    walletAddress &&
    chainConfig.chainId !== null &&
    walletChainId !== null &&
    chainConfig.chainId !== walletChainId;
  const isAdmin =
    walletAddress &&
    contractOwner &&
    walletAddress.toLowerCase() === contractOwner.toLowerCase();
  const latestTransaction = recentActivity[0];

  const getReadProvider = useCallback(() => {
    if (chainConfig.rpcUrl) {
      return new JsonRpcProvider(chainConfig.rpcUrl);
    }

    if (typeof window !== "undefined" && window.ethereum) {
      return new BrowserProvider(window.ethereum);
    }

    throw new Error("Configure NEXT_PUBLIC_RPC_URL or connect MetaMask to read on-chain activity.");
  }, []);

  const getWalletProvider = useCallback(() => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask is required for admin actions.");
    }

    return new BrowserProvider(window.ethereum);
  }, []);

  const refreshActivity = useCallback(async () => {
    if (!contractConfigured) {
      setPageError("Set NEXT_PUBLIC_CONTRACT_ADDRESS before opening the admin console.");
      return;
    }

    setIsLoadingActivity(true);
    setPageError("");

    try {
      const provider = getReadProvider();
      const contract = new Contract(chainConfig.contractAddress, blockTicketAbi, provider);
      const network = await provider.getNetwork();
      const latestBlockNumber = await provider.getBlockNumber();
      const owner = await contract.owner();
      const fromBlock =
        chainConfig.deployBlock ?? Math.max(Number(latestBlockNumber) - 4000, 0);

      setReadChainId(Number(network.chainId));
      setContractOwner(owner);

      const [mintedLogs, listedLogs, resoldLogs, cancelledLogs, usedLogs] = await Promise.all([
        contract.queryFilter("TicketMinted", fromBlock),
        contract.queryFilter("TicketListed", fromBlock),
        contract.queryFilter("TicketResold", fromBlock),
        contract.queryFilter("ResaleCancelled", fromBlock),
        contract.queryFilter("TicketUsed", fromBlock),
      ]);

      const blockCache = new Map<number, string>();
      const combinedLogs: NamedLog[] = [
        ...mintedLogs.filter(hasEventArgs).map((log) => ({ eventName: "TicketMinted", log })),
        ...listedLogs.filter(hasEventArgs).map((log) => ({ eventName: "TicketListed", log })),
        ...resoldLogs.filter(hasEventArgs).map((log) => ({ eventName: "TicketResold", log })),
        ...cancelledLogs.filter(hasEventArgs).map((log) => ({ eventName: "ResaleCancelled", log })),
        ...usedLogs.filter(hasEventArgs).map((log) => ({ eventName: "TicketUsed", log })),
      ]
        .sort((left, right) => {
          if (left.log.blockNumber !== right.log.blockNumber) {
            return Number(right.log.blockNumber) - Number(left.log.blockNumber);
          }

          return Number(right.log.index ?? 0) - Number(left.log.index ?? 0);
        })
        .slice(0, 10);

      const items = await Promise.all(
        combinedLogs.map(async ({ eventName, log }): Promise<ActivityItem> => {
          const blockNumber = Number(log.blockNumber);
          const existingTimestamp = blockCache.get(blockNumber);
          let timestamp = existingTimestamp;

          if (!timestamp) {
            const block = await provider.getBlock(blockNumber);
            timestamp = formatTimestamp(block?.timestamp ?? 0);
            blockCache.set(blockNumber, timestamp);
          }

          const tokenId = log.args?.[0]?.toString() ?? "-";
          let title = eventName;
          let detail = "";

          if (eventName === "TicketMinted") {
            title = "Ticket minted";
            detail = `Token #${tokenId} → ${formatAddress(String(log.args?.[1] ?? ""))} · ${formatEthValue(log.args?.[2] ?? "0 ETH")}`;
          } else if (eventName === "TicketListed") {
            title = "Ticket listed";
            detail = `Token #${tokenId} listed by ${formatAddress(String(log.args?.[1] ?? ""))} at ${formatEthValue(log.args?.[2] ?? "0 ETH")}`;
          } else if (eventName === "TicketResold") {
            title = "Ticket resold";
            detail = `Token #${tokenId} ${formatAddress(String(log.args?.[1] ?? ""))} → ${formatAddress(String(log.args?.[2] ?? ""))} at ${formatEthValue(log.args?.[3] ?? "0 ETH")}`;
          } else if (eventName === "ResaleCancelled") {
            title = "Listing cancelled";
            detail = `Token #${tokenId} listing removed from the market`;
          } else if (eventName === "TicketUsed") {
            title = "Ticket checked in";
            detail = `Token #${tokenId} marked used for ${formatAddress(String(log.args?.[1] ?? ""))}`;
          }

          return {
            txHash: log.transactionHash,
            blockNumber,
            timestamp,
            title,
            detail,
            tokenId,
            explorerUrl: getExplorerTransactionUrl(
              log.transactionHash,
              chainConfig.explorerTxBaseUrl,
            ),
          };
        }),
      );

      setRecentActivity(items);

      const uniqueMintedTokenIds = Array.from(
        new Set(
          mintedLogs
            .map((log) => (hasEventArgs(log) ? log.args?.[0]?.toString() : undefined))
            .filter((tokenId): tokenId is string => Boolean(tokenId)),
        ),
      )
        .sort((left, right) => Number(right) - Number(left))
        .slice(0, 8);

      const tickets = await Promise.all(
        uniqueMintedTokenIds.map(async (tokenId): Promise<ChainTicketItem> => {
          const [details, ownerAddress, used, offer, cap, currentPrice] = await Promise.all([
            contract.getTicketDetails(tokenId),
            contract.ownerOf(tokenId),
            contract.usedTickets(tokenId),
            contract.resaleOffers(tokenId),
            contract.maxResalePrice(tokenId),
            contract.currentPrice(tokenId),
          ]);

          return {
            tokenId,
            eventName: details.eventName,
            seatLabel: details.seatLabel,
            originalPrice: formatEthValue(details.originalPrice),
            currentPrice: formatEthValue(currentPrice),
            resaleCap: formatEthValue(cap),
            owner: formatAddress(ownerAddress),
            used: Boolean(used),
            listed: Boolean(offer.active),
          };
        }),
      );

      setChainTickets(tickets);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setIsLoadingActivity(false);
    }
  }, [contractConfigured, getReadProvider]);

  useEffect(() => {
    setHasWallet(Boolean(window.ethereum));
    void refreshActivity();
  }, [refreshActivity]);

  useEffect(() => {
    if (!window.ethereum?.on) {
      return;
    }

    const handleAccountsChanged = async (accounts: unknown) => {
      const nextAccount = Array.isArray(accounts) ? String(accounts[0] ?? "") : "";
      setWalletAddress(nextAccount);

      if (!nextAccount) {
        setWalletChainId(null);
      }

      await refreshActivity();
    };

    const handleChainChanged = async () => {
      await refreshActivity();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [refreshActivity]);

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setPageError("");

    try {
      const provider = getWalletProvider();
      const accounts = (await provider.send("eth_requestAccounts", [])) as string[];
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();

      setWalletAddress(accounts[0] ?? (await signer.getAddress()));
      setWalletChainId(Number(network.chainId));
      setMintForm((current) => ({
        ...current,
        recipient: current.recipient || accounts[0] || "",
      }));
      await refreshActivity();
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setIsConnecting(false);
    }
  }, [getWalletProvider, refreshActivity]);

  const runAdminTransaction = useCallback(
    async (
      action: string,
      callback: (contract: Contract) => Promise<{ hash: string; wait: () => Promise<{ blockNumber: number } | null> }>,
    ) => {
      setTransactionState({
        ...initialTransactionState,
        status: "awaiting_wallet",
        action,
      });
      setPageError("");

      try {
        const provider = getWalletProvider();
        const signer = await provider.getSigner();
        const signerAddress = await signer.getAddress();
        const network = await provider.getNetwork();
        const contract = new Contract(chainConfig.contractAddress, blockTicketAbi, signer);
        const owner = contractOwner || (await contract.owner());

        setWalletAddress(signerAddress);
        setWalletChainId(Number(network.chainId));

        if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
          throw new Error("Connected wallet is not the contract owner.");
        }

        if (chainConfig.chainId !== null && Number(network.chainId) !== chainConfig.chainId) {
          throw new Error(`Switch MetaMask to chain ID ${chainConfig.chainId}.`);
        }

        const transaction = await callback(contract);

        setTransactionState({
          status: "pending",
          action,
          hash: transaction.hash,
          blockNumber: "",
          error: "",
          explorerUrl: getExplorerTransactionUrl(
            transaction.hash,
            chainConfig.explorerTxBaseUrl,
          ),
        });

        const receipt = await transaction.wait();

        setTransactionState({
          status: "confirmed",
          action,
          hash: transaction.hash,
          blockNumber: receipt?.blockNumber?.toString() ?? "",
          error: "",
          explorerUrl: getExplorerTransactionUrl(
            transaction.hash,
            chainConfig.explorerTxBaseUrl,
          ),
        });

        await refreshActivity();
      } catch (error) {
        const message = getErrorMessage(error);

        setTransactionState({
          ...initialTransactionState,
          status: "failed",
          action,
          error: message,
        });
      }
    },
    [contractOwner, getWalletProvider, refreshActivity],
  );

  const handleMintTicket = async () => {
    await runAdminTransaction("Mint ticket", async (contract) =>
      contract.mintTicket(
        mintForm.recipient,
        mintForm.eventName,
        mintForm.seatLabel,
        parseEther(mintForm.originalPrice),
      ),
    );
  };

  const handleMarkUsed = async () => {
    await runAdminTransaction("Mark ticket used", async (contract) =>
      contract.markTicketUsed(BigInt(usedTokenId)),
    );
  };

  const setupChecklist = useMemo(
    () => [
      "Deploy `TicketNFT.sol` to Sepolia with `npm run contracts:deploy:sepolia`.",
      "Copy the deployment output into `.env.local` as `NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_RPC_URL`, and `NEXT_PUBLIC_EXPLORER_TX_BASE_URL`.",
      "Open `/admin`, connect the organizer wallet, then mint a ticket to generate a visible on-chain transaction.",
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(68,211,255,0.18),_transparent_28%),radial-gradient(circle_at_right,_rgba(217,70,239,0.16),_transparent_32%),linear-gradient(180deg,_#020617_0%,_#071225_55%,_#0f172a_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="rounded-[32px] border border-white/10 bg-white/8 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/70">Block Ticket Admin</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
                Real on-chain operations and transaction proof
              </h1>
              <p className="mt-4 text-sm leading-7 text-slate-300 md:text-base">
                This console connects MetaMask to the deployed contract, submits organizer actions,
                and reads the resulting transaction history directly from chain events.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-full border border-white/10 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/8"
              >
                Back to marketplace
              </Link>
              <button
                className="rounded-full bg-gradient-to-r from-cyan-300 to-fuchsia-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={connectWallet}
                disabled={!hasWallet || isConnecting}
              >
                {isConnecting ? "Connecting..." : walletAddress ? "Reconnect wallet" : "Connect MetaMask"}
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-[24px] border border-white/10 bg-slate-950/45 p-5">
              <p className="text-sm text-slate-400">Configured network</p>
              <p className="mt-3 text-2xl font-semibold">{chainConfig.networkName}</p>
              <p className="mt-2 text-sm text-slate-300">
                Chain ID {chainConfig.chainId ?? "not set"}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-slate-950/45 p-5">
              <p className="text-sm text-slate-400">Detected chain</p>
              <p className="mt-3 text-2xl font-semibold">{walletChainId ?? readChainId ?? "N/A"}</p>
              <p className={`mt-2 text-sm ${chainMismatch ? "text-amber-200" : "text-slate-300"}`}>
                {chainMismatch ? "Wallet is on the wrong network" : "Ready for reads and writes"}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-slate-950/45 p-5">
              <p className="text-sm text-slate-400">Admin wallet</p>
              <p className="mt-3 text-2xl font-semibold">{formatAddress(contractOwner)}</p>
              <p className="mt-2 text-sm text-slate-300">
                {isAdmin ? "Connected wallet owns the contract" : "Organizer wallet required for writes"}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-slate-950/45 p-5">
              <p className="text-sm text-slate-400">Latest transaction</p>
              <p className="mt-3 text-2xl font-semibold">{latestTransaction?.tokenId ? `#${latestTransaction.tokenId}` : "None"}</p>
              <p className="mt-2 text-sm text-slate-300">{latestTransaction?.title ?? "No on-chain activity loaded yet"}</p>
            </div>
          </div>
        </header>

        <main className="mt-8 grid flex-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <section className="rounded-[30px] border border-white/10 bg-white/8 p-6 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/70">Contract status</p>
                  <h2 className="mt-2 text-2xl font-semibold">Deployment inputs and proof path</h2>
                </div>
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                  {contractConfigured ? "Contract configured" : "Configuration required"}
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-[20px] border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Contract address</p>
                  <p className="mt-2 break-all font-mono text-sm text-white">
                    {chainConfig.contractAddress || "NEXT_PUBLIC_CONTRACT_ADDRESS not set"}
                  </p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Connected wallet</p>
                  <p className="mt-2 break-all font-mono text-sm text-white">
                    {walletAddress || "Connect MetaMask to send admin transactions"}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[20px] border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
                <p className="font-semibold text-white">Demo proof flow</p>
                <ul className="mt-3 space-y-2">
                  <li>1. Connect the organizer wallet and submit a mint or check-in transaction.</li>
                  <li>2. Capture the returned transaction hash and block number in the panel on the right.</li>
                  <li>3. Open the explorer link to show the same hash on-chain with the emitted event.</li>
                </ul>
              </div>

              {pageError ? (
                <div className="mt-5 rounded-[20px] border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {pageError}
                </div>
              ) : null}
            </section>

            <section className="rounded-[30px] border border-white/10 bg-white/8 p-6 backdrop-blur-xl">
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/70">Admin actions</p>
              <h2 className="mt-2 text-2xl font-semibold">Mint and check in tickets</h2>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-lg font-semibold text-white">Mint ticket</p>
                  <div className="mt-4 space-y-4">
                    <label className="block text-sm text-slate-300">
                      Recipient wallet
                      <input
                        className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                        value={mintForm.recipient}
                        onChange={(event) =>
                          setMintForm((current) => ({ ...current, recipient: event.target.value }))
                        }
                        placeholder="0x..."
                      />
                    </label>
                    <label className="block text-sm text-slate-300">
                      Event name
                      <input
                        className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                        value={mintForm.eventName}
                        onChange={(event) =>
                          setMintForm((current) => ({ ...current, eventName: event.target.value }))
                        }
                      />
                    </label>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm text-slate-300">
                        Seat label
                        <input
                          className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                          value={mintForm.seatLabel}
                          onChange={(event) =>
                            setMintForm((current) => ({ ...current, seatLabel: event.target.value }))
                          }
                        />
                      </label>
                      <label className="block text-sm text-slate-300">
                        Original price (ETH)
                        <input
                          className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                          type="number"
                          min="0"
                          step="0.01"
                          value={mintForm.originalPrice}
                          onChange={(event) =>
                            setMintForm((current) => ({
                              ...current,
                              originalPrice: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <button
                    className="mt-5 w-full rounded-full bg-gradient-to-r from-cyan-300 to-fuchsia-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleMintTicket}
                    disabled={
                      !contractConfigured ||
                      !mintForm.recipient ||
                      !mintForm.eventName ||
                      !mintForm.seatLabel ||
                      !mintForm.originalPrice
                    }
                  >
                    Submit mint transaction
                  </button>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-lg font-semibold text-white">Mark ticket used</p>
                  <p className="mt-3 text-sm text-slate-300">
                    This calls `markTicketUsed(tokenId)` and permanently blocks further transfers.
                  </p>

                  <label className="mt-5 block text-sm text-slate-300">
                    Token ID
                    <input
                      className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                      type="number"
                      min="1"
                      step="1"
                      value={usedTokenId}
                      onChange={(event) => setUsedTokenId(event.target.value)}
                      placeholder="1"
                    />
                  </label>

                  <button
                    className="mt-5 w-full rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleMarkUsed}
                    disabled={!contractConfigured || !usedTokenId}
                  >
                    Submit check-in transaction
                  </button>

                  <div className="mt-6 rounded-[20px] border border-white/10 bg-white/6 p-4 text-sm text-slate-300">
                    <p className="font-semibold text-white">Why this matters</p>
                    <ul className="mt-3 space-y-2">
                      <li>Used tickets cannot be relisted or transferred.</li>
                      <li>The `TicketUsed` event becomes part of the permanent audit trail.</li>
                      <li>Venue staff can verify status from the same contract state.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-white/8 p-6 backdrop-blur-xl">
              <p className="text-sm uppercase tracking-[0.28em] text-emerald-200/70">On-chain ticket inventory</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold">Minted tickets loaded from contract state</h2>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                  {chainTickets.length} tickets
                </span>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {chainTickets.length ? (
                  chainTickets.map((ticket) => (
                    <article
                      key={ticket.tokenId}
                      className="rounded-[22px] border border-white/10 bg-slate-950/50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                            Token #{ticket.tokenId}
                          </p>
                          <h3 className="mt-2 text-lg font-semibold text-white">{ticket.eventName}</h3>
                          <p className="mt-1 text-sm text-slate-300">Seat {ticket.seatLabel}</p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs ${
                            ticket.used
                              ? "border border-red-400/25 bg-red-500/10 text-red-200"
                              : ticket.listed
                                ? "border border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                                : "border border-white/10 bg-white/8 text-slate-200"
                          }`}
                        >
                          {ticket.used ? "Used" : ticket.listed ? "Listed" : "Held"}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[18px] border border-white/10 bg-white/6 p-3 text-sm text-slate-300">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Original</p>
                          <p className="mt-2 font-semibold text-white">{ticket.originalPrice}</p>
                        </div>
                        <div className="rounded-[18px] border border-white/10 bg-white/6 p-3 text-sm text-slate-300">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Current</p>
                          <p className="mt-2 font-semibold text-cyan-200">{ticket.currentPrice}</p>
                        </div>
                        <div className="rounded-[18px] border border-white/10 bg-white/6 p-3 text-sm text-slate-300">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Resale cap</p>
                          <p className="mt-2 font-semibold text-emerald-200">{ticket.resaleCap}</p>
                        </div>
                        <div className="rounded-[18px] border border-white/10 bg-white/6 p-3 text-sm text-slate-300">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Owner</p>
                          <p className="mt-2 font-semibold text-white">{ticket.owner}</p>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[22px] border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300 lg:col-span-2">
                    No minted ticket state loaded yet. Mint one ticket from this page, then refresh to
                    verify the on-chain state change visually.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-white/8 p-6 backdrop-blur-xl">
              <p className="text-sm uppercase tracking-[0.28em] text-fuchsia-200/70">Recent on-chain activity</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold">Events read from the contract</h2>
                <button
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/8"
                  onClick={() => void refreshActivity()}
                  disabled={isLoadingActivity}
                >
                  {isLoadingActivity ? "Refreshing..." : "Refresh activity"}
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {recentActivity.length ? (
                  recentActivity.map((item) => (
                    <article
                      key={`${item.txHash}-${item.title}`}
                      className="rounded-[22px] border border-white/10 bg-slate-950/50 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{item.title}</p>
                          <p className="mt-1 text-sm text-slate-300">{item.detail}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                            {item.timestamp} · block {item.blockNumber}
                          </p>
                        </div>
                        <div className="text-sm text-slate-300">
                          <p className="font-mono text-xs text-cyan-200">{item.txHash}</p>
                          {item.explorerUrl ? (
                            <a
                              href={item.explorerUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100"
                            >
                              View on explorer
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[22px] border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
                    No contract events loaded yet. Deploy the contract, set the public environment
                    variables, and refresh this panel.
                  </div>
                )}
              </div>
            </section>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[30px] border border-white/10 bg-white/8 p-6 backdrop-blur-xl">
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/70">Transaction state</p>
              <h2 className="mt-2 text-2xl font-semibold">{getStatusLabel(transactionState.status)}</h2>

              <div className="mt-5 rounded-[22px] border border-white/10 bg-slate-950/55 p-5 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Action</span>
                  <span className="font-semibold text-white">{transactionState.action || "None"}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span>Status</span>
                  <span className="font-semibold text-white">{transactionState.status}</span>
                </div>
                <div className="mt-3">
                  <p className="text-slate-400">Transaction hash</p>
                  <p className="mt-1 break-all font-mono text-xs text-cyan-200">
                    {transactionState.hash || "Pending first write"}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span>Block number</span>
                  <span className="font-semibold text-white">
                    {transactionState.blockNumber || "Pending confirmation"}
                  </span>
                </div>
                {transactionState.explorerUrl ? (
                  <a
                    href={transactionState.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100"
                  >
                    Open transaction in explorer
                  </a>
                ) : null}
                {transactionState.error ? (
                  <div className="mt-4 rounded-[18px] border border-red-400/35 bg-red-500/10 px-4 py-3 text-red-200">
                    {transactionState.error}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-white/8 p-6 backdrop-blur-xl">
              <p className="text-sm uppercase tracking-[0.28em] text-fuchsia-200/70">Setup checklist</p>
              <h2 className="mt-2 text-2xl font-semibold">What has to exist before the demo</h2>
              <div className="mt-5 rounded-[22px] border border-white/10 bg-slate-950/55 p-5 text-sm text-slate-300">
                <ul className="space-y-3">
                  {setupChecklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
}
