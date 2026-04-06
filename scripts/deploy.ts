import { network } from "hardhat";

const { ethers } = await network.connect();

async function main() {
  const [organizer] = await ethers.getSigners();
  const ticketContract = await ethers.deployContract("TicketNFT", [organizer.address]);

  await ticketContract.waitForDeployment();

  console.log(`TicketNFT deployed to: ${await ticketContract.getAddress()}`);
  console.log(`Organizer address: ${organizer.address}`);

  const mintTransaction = await ticketContract.mintTicket(
    organizer.address,
    "Block Ticket Genesis Event",
    "A-01",
    ethers.parseEther("1"),
  );

  await mintTransaction.wait();

  console.log("Seed ticket minted for local preview.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
