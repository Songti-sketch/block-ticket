import { formatEther } from "ethers";

export const blockTicketAbi = [
  "function owner() view returns (address)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function mintTicket(address to, string eventName, string seatLabel, uint256 originalPrice) returns (uint256)",
  "function markTicketUsed(uint256 tokenId)",
  "function usedTickets(uint256 tokenId) view returns (bool)",
  "function maxResalePrice(uint256 tokenId) view returns (uint256)",
  "function currentPrice(uint256 tokenId) view returns (uint256)",
  "function getTicketDetails(uint256 tokenId) view returns ((uint256 originalPrice, string eventName, string seatLabel))",
  "function resaleOffers(uint256 tokenId) view returns (address seller, uint256 price, bool active)",
  "event TicketMinted(uint256 indexed tokenId, address indexed owner, uint256 originalPrice, string eventName, string seatLabel)",
  "event TicketListed(uint256 indexed tokenId, address indexed seller, uint256 resalePrice)",
  "event TicketResold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 resalePrice)",
  "event ResaleCancelled(uint256 indexed tokenId)",
  "event TicketUsed(uint256 indexed tokenId, address indexed owner)",
] as const;

export type PublicChainConfig = {
  contractAddress: string;
  chainId: number | null;
  networkName: string;
  rpcUrl: string;
  explorerTxBaseUrl: string;
  deployBlock: number | null;
};

export function getPublicChainConfig(): PublicChainConfig {
  const parsedChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "");
  const parsedDeployBlock = Number(process.env.NEXT_PUBLIC_CONTRACT_DEPLOY_BLOCK ?? "");

  return {
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "",
    chainId: Number.isFinite(parsedChainId) && parsedChainId > 0 ? parsedChainId : null,
    networkName: process.env.NEXT_PUBLIC_NETWORK_NAME ?? "Unconfigured network",
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? "",
    explorerTxBaseUrl: process.env.NEXT_PUBLIC_EXPLORER_TX_BASE_URL ?? "",
    deployBlock:
      Number.isFinite(parsedDeployBlock) && parsedDeployBlock >= 0 ? parsedDeployBlock : null,
  };
}

export function formatAddress(address: string) {
  if (!address) {
    return "Not connected";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatEthValue(value: unknown) {
  if (typeof value === "bigint") {
    return `${Number(formatEther(value)).toFixed(4)} ETH`;
  }

  if (typeof value === "number") {
    return `${value.toFixed(4)} ETH`;
  }

  if (typeof value === "string") {
    return value;
  }

  return "0 ETH";
}

export function getExplorerTransactionUrl(hash: string, baseUrl: string) {
  if (!hash || !baseUrl) {
    return "";
  }

  return `${baseUrl.replace(/\/$/, "")}/${hash}`;
}

export function formatTimestamp(unixTimestamp: number) {
  return new Date(unixTimestamp * 1000).toLocaleString();
}

export function withBasePath(path: string) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  if (!path.startsWith("/")) {
    return `${basePath}/${path}`;
  }

  return `${basePath}${path}`;
}
