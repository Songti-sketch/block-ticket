import { network } from "hardhat";

const { ethers } = await network.connect();

async function main() {
  const [organizer] = await ethers.getSigners();
  const ticketContract = await ethers.deployContract("TicketNFT", [organizer.address]);
  const networkName = process.env.HARDHAT_NETWORK ?? "hardhatMainnet";

  await ticketContract.waitForDeployment();

  const contractAddress = await ticketContract.getAddress();
  const deploymentTransaction = ticketContract.deploymentTransaction();

  console.log(`TicketNFT deployed to: ${contractAddress}`);
  console.log(`Organizer address: ${organizer.address}`);
  console.log(`Network: ${networkName}`);

  if (deploymentTransaction) {
    const receipt = await deploymentTransaction.wait();

    console.log(`Deployment tx hash: ${deploymentTransaction.hash}`);

    if (receipt) {
      console.log(`Deployment block: ${receipt.blockNumber}`);
    }
  }

  if (networkName === "hardhatMainnet" || process.env.SEED_DEMO_TICKET === "true") {
    const mintTransaction = await ticketContract.mintTicket(
      organizer.address,
      "Block Ticket Genesis Event",
      "A-01",
      ethers.parseEther("1"),
    );
    const mintReceipt = await mintTransaction.wait();

    console.log(`Seed ticket minted in tx: ${mintTransaction.hash}`);

    if (mintReceipt) {
      console.log(`Seed mint block: ${mintReceipt.blockNumber}`);
    }
  }

  console.log("");
  console.log("Frontend environment values:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`NEXT_PUBLIC_CHAIN_ID=${Number((await ethers.provider.getNetwork()).chainId)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
