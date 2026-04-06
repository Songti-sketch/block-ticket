// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract TicketNFT is ERC721, Ownable {
    struct TicketDetails {
        uint256 originalPrice;
        string eventName;
        string seatLabel;
    }

    struct ResaleOffer {
        address seller;
        uint256 price;
        bool active;
    }

    uint256 private _nextTokenId = 1;

    mapping(uint256 tokenId => TicketDetails) private _ticketDetails;
    mapping(uint256 tokenId => ResaleOffer) public resaleOffers;

    event TicketMinted(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 originalPrice,
        string eventName,
        string seatLabel
    );
    event TicketListed(uint256 indexed tokenId, address indexed seller, uint256 resalePrice);
    event TicketResold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 resalePrice);
    event ResaleCancelled(uint256 indexed tokenId);

    constructor(address organizer) ERC721("Block Ticket", "BTIX") Ownable(organizer) {}

    function mintTicket(
        address to,
        string calldata eventName,
        string calldata seatLabel,
        uint256 originalPrice
    ) external onlyOwner returns (uint256 tokenId) {
        require(originalPrice > 0, "Original price must be positive");

        tokenId = _nextTokenId;
        _nextTokenId += 1;

        _safeMint(to, tokenId);
        _ticketDetails[tokenId] = TicketDetails({
            originalPrice: originalPrice,
            eventName: eventName,
            seatLabel: seatLabel
        });

        emit TicketMinted(tokenId, to, originalPrice, eventName, seatLabel);
    }

    function listTicketForResale(uint256 tokenId, uint256 newPrice) external {
        require(ownerOf(tokenId) == msg.sender, "Only ticket owner can list");
        require(newPrice <= maxResalePrice(tokenId), "Price exceeds scalping cap");

        resaleOffers[tokenId] = ResaleOffer({
            seller: msg.sender,
            price: newPrice,
            active: true
        });

        emit TicketListed(tokenId, msg.sender, newPrice);
    }

    function cancelResale(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Only ticket owner can cancel");
        require(resaleOffers[tokenId].active, "Ticket is not listed");

        delete resaleOffers[tokenId];
        emit ResaleCancelled(tokenId);
    }

    function resaleTicket(uint256 tokenId, uint256 newPrice) external payable {
        ResaleOffer memory offer = resaleOffers[tokenId];

        require(offer.active, "Ticket is not listed");
        require(newPrice <= maxResalePrice(tokenId), "Price exceeds scalping cap");
        require(newPrice == offer.price, "Resale price mismatch");
        require(msg.value == newPrice, "Incorrect payment");
        require(ownerOf(tokenId) == offer.seller, "Seller no longer owns ticket");
        require(msg.sender != offer.seller, "Seller cannot buy own ticket");

        delete resaleOffers[tokenId];
        _transfer(offer.seller, msg.sender, tokenId);

        (bool success, ) = payable(offer.seller).call{value: msg.value}("");
        require(success, "Payment failed");

        emit TicketResold(tokenId, offer.seller, msg.sender, newPrice);
    }

    function maxResalePrice(uint256 tokenId) public view returns (uint256) {
        TicketDetails memory details = _ticketDetails[tokenId];
        require(details.originalPrice > 0, "Ticket does not exist");

        return (details.originalPrice * 110) / 100;
    }

    function getTicketDetails(uint256 tokenId) external view returns (TicketDetails memory) {
        TicketDetails memory details = _ticketDetails[tokenId];
        require(details.originalPrice > 0, "Ticket does not exist");
        return details;
    }

    function currentPrice(uint256 tokenId) external view returns (uint256) {
        ResaleOffer memory offer = resaleOffers[tokenId];
        if (offer.active) {
            return offer.price;
        }

        return _ticketDetails[tokenId].originalPrice;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address previousOwner = super._update(to, tokenId, auth);

        if (previousOwner != address(0) && previousOwner != to && resaleOffers[tokenId].active) {
            delete resaleOffers[tokenId];
        }

        return previousOwner;
    }
}
