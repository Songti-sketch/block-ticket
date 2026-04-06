import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("TicketNFT", function () {
  async function deployTicketFixture() {
    const [organizer, seller, buyer] = await ethers.getSigners();
    const ticketContract = await ethers.deployContract("TicketNFT", [organizer.address]);

    await ticketContract.waitForDeployment();

    const originalPrice = ethers.parseEther("1");
    const mintTransaction = await ticketContract
      .connect(organizer)
      .mintTicket(seller.address, "Seoul Synth Fest", "A-12", originalPrice);

    await mintTransaction.wait();

    return {
      ticketContract,
      organizer,
      seller,
      buyer,
      originalPrice,
    };
  }

  it("mints a ticket with immutable original pricing data", async function () {
    const { ticketContract, seller, originalPrice } = await deployTicketFixture();

    const ticketDetails = await ticketContract.getTicketDetails(1);

    expect(await ticketContract.ownerOf(1)).to.equal(seller.address);
    expect(ticketDetails.originalPrice).to.equal(originalPrice);
    expect(ticketDetails.eventName).to.equal("Seoul Synth Fest");
    expect(ticketDetails.seatLabel).to.equal("A-12");
  });

  it("allows resale at 105% of the original price", async function () {
    const { ticketContract, seller, buyer, originalPrice } = await deployTicketFixture();
    const cappedResalePrice = (originalPrice * 105n) / 100n;

    await expect(ticketContract.connect(seller).listTicketForResale(1, cappedResalePrice))
      .to.emit(ticketContract, "TicketListed")
      .withArgs(1n, seller.address, cappedResalePrice);

    await expect(
      ticketContract.connect(buyer).resaleTicket(1, cappedResalePrice, {
        value: cappedResalePrice,
      }),
    )
      .to.emit(ticketContract, "TicketResold")
      .withArgs(1n, seller.address, buyer.address, cappedResalePrice);

    expect(await ticketContract.ownerOf(1)).to.equal(buyer.address);

    const listing = await ticketContract.resaleOffers(1);
    expect(listing.active).to.equal(false);
  });

  it("reverts when the resale price exceeds the 110% cap", async function () {
    const { ticketContract, seller, originalPrice } = await deployTicketFixture();
    const invalidResalePrice = (originalPrice * 115n) / 100n;

    await expect(ticketContract.connect(seller).listTicketForResale(1, invalidResalePrice)).to.be
      .revertedWith("Price exceeds scalping cap");
  });
});
