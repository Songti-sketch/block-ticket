"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { withBasePath } from "@/lib/block-ticket";
import {
  cancelDemoListing,
  formatRemainingSeconds,
  formatLedgerTime,
  formatTokenAmount,
  getCheckInRemainingSeconds,
  getAccountName,
  getResaleCutoffHours,
  getTicketCap,
  getTicketStatus,
  isResaleWindowClosed,
  listDemoTicket,
  setDemoTicketListingPrice,
  simulateTicketSale,
  startDemoCheckIn,
  subscribeDemoLedger,
  type DemoLedgerState,
  readDemoLedgerState,
} from "@/lib/demo-ledger";

function getUsageRatio(currentPrice: number, cap: number) {
  return Math.min((currentPrice / Math.max(cap, 0.01)) * 100, 100);
}

function getHeadroom(currentPrice: number, cap: number) {
  return Math.max(cap - currentPrice, 0);
}

function statusTone(status: ReturnType<typeof getTicketStatus>) {
  switch (status) {
    case "used":
      return "border-stone-300/70 bg-stone-100/80 text-stone-800";
    case "check_in_pending":
      return "border-amber-300/70 bg-amber-100/85 text-amber-900";
    case "listed":
      return "border-emerald-300/70 bg-emerald-100/85 text-emerald-800";
    default:
      return "border-slate-300/70 bg-slate-100/85 text-slate-800";
  }
}

function statusLabel(status: ReturnType<typeof getTicketStatus>) {
  switch (status) {
    case "used":
      return "Checked in";
    case "check_in_pending":
      return "Gate lock";
    case "listed":
      return "Listed";
    default:
      return "Held";
  }
}

export function BlockTicketDashboard() {
  const [ledger, setLedger] = useState<DemoLedgerState>(() => readDemoLedgerState());
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(() => {
    const initialState = readDemoLedgerState();
    return initialState.tickets[0]?.id ?? null;
  });
  const [currentConsumerId, setCurrentConsumerId] = useState("acct-lin");
  const [settlementAmount, setSettlementAmount] = useState("0.72");
  const [panelMessage, setPanelMessage] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const unsubscribe = subscribeDemoLedger((state) => {
      setLedger(state);
    });
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
      setLedger(readDemoLedgerState());
    }, 1000);

    return () => {
      unsubscribe();
      window.clearInterval(intervalId);
    };
  }, []);

  const selectedTicket =
    ledger.tickets.find((ticket) => ticket.id === selectedTicketId) ?? ledger.tickets[0] ?? null;
  const selectedTicketStatus = selectedTicket ? getTicketStatus(selectedTicket, nowMs) : null;
  const selectedTicketRemainingSeconds = selectedTicket
    ? getCheckInRemainingSeconds(selectedTicket, nowMs)
    : 0;
  const consumerAccounts = ledger.accounts.filter((account) => account.id !== "acct-organizer");
  const effectiveCurrentConsumerId = consumerAccounts.some((account) => account.id === currentConsumerId)
    ? currentConsumerId
    : consumerAccounts[0]?.id ?? "";
  const currentConsumer =
    consumerAccounts.find((account) => account.id === effectiveCurrentConsumerId) ?? null;
  const isCurrentConsumerOwner = !!selectedTicket && selectedTicket.ownerAccountId === effectiveCurrentConsumerId;
  const capAmount = selectedTicket ? getTicketCap(selectedTicket) : 0;
  const resaleWindowClosed = selectedTicket ? isResaleWindowClosed(selectedTicket, nowMs) : false;
  const parsedSettlementAmount = Number(settlementAmount || 0);
  const exceedsCap = parsedSettlementAmount > capAmount;
  const hasValidSettlementAmount = Number.isFinite(parsedSettlementAmount) && parsedSettlementAmount > 0;
  const listedCount = ledger.tickets.filter(
    (ticket) =>
      ticket.listed &&
      !ticket.used &&
      getTicketStatus(ticket, nowMs) !== "check_in_pending" &&
      !isResaleWindowClosed(ticket, nowMs),
  ).length;
  const checkedInCount = ledger.tickets.filter((ticket) => ticket.used).length;
  const gateLockCount = ledger.tickets.filter(
    (ticket) => getTicketStatus(ticket, nowMs) === "check_in_pending",
  ).length;
  const currentConsumerInventory = ledger.tickets.filter(
    (ticket) => ticket.ownerAccountId === effectiveCurrentConsumerId,
  );
  const currentConsumerOwnedTickets = ledger.tickets.filter(
    (ticket) => ticket.ownerAccountId === effectiveCurrentConsumerId && !ticket.used,
  ).length;

  const handleSettle = () => {
    if (!selectedTicket || !currentConsumer) {
      setPanelMessage("Select a ticket and a consumer identity before submitting.");
      return;
    }

    try {
      simulateTicketSale({
        ticketId: selectedTicket.id,
        buyerAccountId: currentConsumer.id,
        amount: selectedTicket.currentPrice,
      });
      setSettlementAmount(selectedTicket.currentPrice.toFixed(2));
      setPanelMessage(
        `Purchase completed as ${currentConsumer.name}. The ticket is now held in this account until the owner actively lists it again.`,
      );
    } catch (error) {
      setPanelMessage(error instanceof Error ? error.message : "Submission failed.");
    }
  };

  const handleStartCheckIn = () => {
    if (!selectedTicket) {
      setPanelMessage("Select a ticket before starting gate validation.");
      return;
    }

    if (selectedTicket.ownerAccountId !== effectiveCurrentConsumerId) {
      setPanelMessage("Only the current ticket holder can start gate validation from the marketplace.");
      return;
    }

    try {
      startDemoCheckIn(selectedTicket.id);
      setPanelMessage("Gate validation started. The ticket is now locked for transfer for 3 minutes.");
    } catch (error) {
      setPanelMessage(error instanceof Error ? error.message : "Unable to start gate validation.");
    }
  };

  const handleListTicket = () => {
    if (!selectedTicket) {
      setPanelMessage("Select a ticket before listing it.");
      return;
    }

    if (selectedTicket.ownerAccountId !== effectiveCurrentConsumerId) {
      setPanelMessage("Only the current ticket holder can list this ticket for resale.");
      return;
    }

    try {
      setDemoTicketListingPrice(selectedTicket.id, parsedSettlementAmount);
      listDemoTicket(selectedTicket.id);
      setPanelMessage("The ticket is now listed. It remains in the seller account until a buyer completes the trade.");
    } catch (error) {
      setPanelMessage(error instanceof Error ? error.message : "Unable to list the ticket.");
    }
  };

  const handleUpdateListing = () => {
    if (!selectedTicket) {
      setPanelMessage("Select a ticket before updating its listing price.");
      return;
    }

    if (selectedTicket.ownerAccountId !== effectiveCurrentConsumerId) {
      setPanelMessage("Only the current ticket holder can update this listing.");
      return;
    }

    try {
      setDemoTicketListingPrice(selectedTicket.id, parsedSettlementAmount);
      setPanelMessage("The listing price has been updated and synchronized across the marketplace and operations console.");
    } catch (error) {
      setPanelMessage(error instanceof Error ? error.message : "Unable to update the listing.");
    }
  };

  const handleCancelListing = () => {
    if (!selectedTicket) {
      setPanelMessage("Select a ticket before updating its listing state.");
      return;
    }

    if (selectedTicket.ownerAccountId !== effectiveCurrentConsumerId) {
      setPanelMessage("Only the current ticket holder can cancel this listing.");
      return;
    }

    try {
      cancelDemoListing(selectedTicket.id);
      setPanelMessage("The listing has been cancelled. The ticket stays with the current owner.");
    } catch (error) {
      setPanelMessage(error instanceof Error ? error.message : "Unable to cancel the listing.");
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#050b16_50%,_#020617_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="rounded-[28px] border border-white/10 bg-slate-950/70 px-6 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                Simulation Mode
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                Ticket settlement without MetaMask
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                Users can enter a settlement amount and trigger a simulated trade directly from the marketplace.
                Virtual accounts handle the settlement, the backend ledger is updated, and ownership, price,
                status, and the admin operations view refresh in sync.
              </p>
              <p className="mt-3 text-sm text-amber-200">
                Resale closes automatically {getResaleCutoffHours()} hours before the event starts.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="min-w-[260px] rounded-[22px] border border-white/10 bg-slate-900/70 px-4 py-3 text-sm">
                <span className="block text-xs uppercase tracking-[0.18em] text-slate-400">Consumer identity</span>
                <select
                  className="mt-2 w-full bg-transparent text-sm font-medium text-slate-100 outline-none"
                  value={effectiveCurrentConsumerId}
                  onChange={(event) => {
                    setCurrentConsumerId(event.target.value);
                    setPanelMessage("");
                  }}
                >
                  {consumerAccounts.map((account) => (
                    <option key={account.id} value={account.id} className="bg-slate-950">
                      {account.name} · Balance {formatTokenAmount(account.balance)}
                    </option>
                  ))}
                </select>
              </label>
              <Link
                href="/admin"
                className="rounded-full border border-white/10 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/8"
              >
                Open operations console
              </Link>
              <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-200">
                Price cap active: 110% of original
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <article className="rounded-[22px] border border-white/10 bg-slate-900/70 p-5">
              <p className="text-sm text-slate-400">Available tickets</p>
              <p className="mt-3 text-3xl font-semibold">{ledger.tickets.length}</p>
              <p className="mt-2 text-sm text-slate-400">Shared demo inventory</p>
            </article>
            <article className="rounded-[22px] border border-white/10 bg-slate-900/70 p-5">
              <p className="text-sm text-slate-400">Active listings</p>
              <p className="mt-3 text-3xl font-semibold">{listedCount}</p>
              <p className="mt-2 text-sm text-slate-400">Ready for settlement</p>
            </article>
            <article className="rounded-[22px] border border-white/10 bg-slate-900/70 p-5">
              <p className="text-sm text-slate-400">Checked in</p>
              <p className="mt-3 text-3xl font-semibold">{checkedInCount}</p>
              <p className="mt-2 text-sm text-slate-400">Locked from transfer</p>
            </article>
            <article className="rounded-[22px] border border-white/10 bg-slate-900/70 p-5">
              <p className="text-sm text-slate-400">Gate locks</p>
              <p className="mt-3 text-3xl font-semibold">{gateLockCount}</p>
              <p className="mt-2 text-sm text-slate-400">Tickets in active check-in flow</p>
            </article>
            <article className="rounded-[22px] border border-white/10 bg-slate-900/70 p-5">
              <p className="text-sm text-slate-400">Held by current consumer</p>
              <p className="mt-3 text-3xl font-semibold">{currentConsumerOwnedTickets}</p>
              <p className="mt-2 text-sm text-slate-400">
                {currentConsumer ? `${currentConsumer.name} currently owns` : "Current account ownership"}
              </p>
            </article>
          </div>
        </header>

        <main className="mt-8 grid flex-1 gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <section className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Marketplace Inventory</p>
                  <h2 className="mt-2 text-2xl font-semibold">Current ticket pool</h2>
                </div>
                <p className="text-sm text-slate-400">Ownership and price update immediately after settlement.</p>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {ledger.tickets.map((ticket) => {
                  const ownerName = getAccountName(ledger, ticket.ownerAccountId);
                  const isSelected = ticket.id === selectedTicket?.id;
                  const resaleCap = getTicketCap(ticket);
                  const usageRatio = getUsageRatio(ticket.currentPrice, resaleCap);
                  const headroom = getHeadroom(ticket.currentPrice, resaleCap);
                  const ticketStatus = getTicketStatus(ticket, nowMs);
                  const ticketRemainingSeconds = getCheckInRemainingSeconds(ticket, nowMs);
                  const ticketResaleClosed = isResaleWindowClosed(ticket, nowMs);

                  return (
                    <article
                      key={ticket.id}
                      className={`overflow-hidden rounded-[24px] border transition ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]"
                          : "border-white/10 bg-slate-900/70"
                      }`}
                    >
                      <div className="relative h-52">
                        {ticket.imageSrc ? (
                          <Image
                            src={withBasePath(ticket.imageSrc)}
                            alt={ticket.artist}
                            fill
                            className="object-cover"
                            sizes="(max-width: 1024px) 100vw, 50vw"
                          />
                        ) : (
                          <div className={`flex h-full bg-gradient-to-br ${ticket.accent}`} />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
                              #{ticket.id}
                            </span>
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone(ticketStatus)}`}
                            >
                              {statusLabel(ticketStatus)}
                            </span>
                            {ticketStatus === "check_in_pending" ? (
                              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-100">
                                {formatRemainingSeconds(ticketRemainingSeconds)} left
                              </span>
                            ) : null}
                            {ticketResaleClosed ? (
                              <span className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-200">
                                Resale closed
                              </span>
                            ) : null}
                          </div>
                          <h3 className="mt-3 text-2xl font-semibold">{ticket.artist}</h3>
                          <p className="mt-1 text-sm text-white/85">{ticket.event}</p>
                        </div>
                      </div>

                      <div className={`grid gap-4 p-5 ${isSelected ? "text-slate-200" : "text-slate-300"}`}>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className={`rounded-[18px] border p-4 ${isSelected ? "border-white/10 bg-white/5" : "border-white/10 bg-slate-950/70"}`}>
                            <p className="text-xs uppercase tracking-[0.16em] opacity-70">Venue</p>
                            <p className="mt-2 font-semibold">{ticket.venue}</p>
                          </div>
                          <div className={`rounded-[18px] border p-4 ${isSelected ? "border-white/10 bg-white/5" : "border-white/10 bg-slate-950/70"}`}>
                            <p className="text-xs uppercase tracking-[0.16em] opacity-70">Seat</p>
                            <p className="mt-2 font-semibold">{ticket.seat}</p>
                          </div>
                        </div>

                        <div className={`rounded-[18px] border p-4 ${isSelected ? "border-white/10 bg-white/5" : "border-white/10 bg-slate-950/70"}`}>
                          <div className="flex items-center justify-between text-sm">
                            <span>Owner</span>
                            <span className="font-semibold">{ownerName}</span>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-sm">
                            <span>Original Price</span>
                            <span className="font-semibold">{formatTokenAmount(ticket.originalPrice)}</span>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-sm">
                            <span>Resale Cap</span>
                            <span className="font-semibold text-emerald-300">
                              {formatTokenAmount(resaleCap)}
                            </span>
                          </div>
                          <div className="mt-4 flex items-center justify-between text-sm">
                            <span>Current Listing</span>
                            <span className="font-semibold text-cyan-300">
                              {formatTokenAmount(ticket.currentPrice)}
                            </span>
                          </div>

                          <div className="mt-4">
                            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-400">
                              <span>Cap Usage</span>
                              <span>{usageRatio.toFixed(0)}%</span>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${ticket.accent}`}
                                style={{ width: `${usageRatio}%` }}
                              />
                            </div>
                            <p className="mt-2 text-xs text-slate-400">
                              Remaining headroom: {formatTokenAmount(headroom)}
                            </p>
                            {ticketStatus === "check_in_pending" ? (
                              <p className="mt-2 text-xs text-amber-200">
                                Gate validation in progress. Resale is locked for {formatRemainingSeconds(ticketRemainingSeconds)}.
                              </p>
                            ) : ticketResaleClosed ? (
                              <p className="mt-2 text-xs text-red-200">
                                This ticket can no longer be resold because the event starts within {getResaleCutoffHours()} hours.
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <button
                          className={`rounded-full px-4 py-3 text-sm font-semibold transition ${
                            isSelected
                              ? "bg-white text-slate-950 hover:bg-slate-100"
                              : "bg-sky-400 text-slate-950 hover:bg-sky-300"
                          }`}
                          onClick={() => {
                            setSelectedTicketId(ticket.id);
                            setSettlementAmount(ticket.currentPrice.toFixed(2));
                            setPanelMessage("");
                          }}
                        >
                          Open consumer panel
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Recent Activity</p>
                  <h2 className="mt-2 text-2xl font-semibold">Backend ledger records</h2>
                </div>
                <p className="text-sm text-slate-400">Latest 6 actions</p>
              </div>

              <div className="mt-6 space-y-3">
                {ledger.activity.slice(0, 6).map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[20px] border border-white/10 bg-slate-900/70 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-300">{item.detail}</p>
                      </div>
                      <div className="text-sm text-slate-400">
                        <p>{formatTokenAmount(item.amount)}</p>
                        <p className="mt-1">{formatLedgerTime(item.createdAt)}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Consumer Panel</p>
              <h2 className="mt-2 text-2xl font-semibold">
                {selectedTicket ? selectedTicket.artist : "No ticket selected"}
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                {selectedTicket
                  ? `${selectedTicket.event} · ${selectedTicket.venue} · Seat ${selectedTicket.seat}`
                  : "Select a ticket to start the demo."}
              </p>
              {selectedTicket && selectedTicketStatus ? (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <span className={`rounded-full border px-3 py-1 font-medium ${selectedTicketStatus === "check_in_pending" ? "border-amber-400/30 bg-amber-400/10 text-amber-100" : selectedTicketStatus === "used" ? "border-stone-400/30 bg-stone-400/10 text-stone-200" : selectedTicketStatus === "listed" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-white/5 text-slate-200"}`}>
                    Status: {statusLabel(selectedTicketStatus)}
                  </span>
                  {selectedTicketStatus === "check_in_pending" ? (
                    <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 font-medium text-amber-100">
                      Gate lock expires in {formatRemainingSeconds(selectedTicketRemainingSeconds)}
                    </span>
                  ) : null}
                  {resaleWindowClosed ? (
                    <span className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 font-medium text-red-200">
                      Resale closed within {getResaleCutoffHours()} hours of showtime
                    </span>
                  ) : null}
                </div>
              ) : null}

              {selectedTicket ? (
                <>
                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    <div className="rounded-[18px] border border-white/10 bg-slate-900/70 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Current holder</p>
                      <p className="mt-2 text-sm font-semibold text-slate-100">
                        {getAccountName(ledger, selectedTicket.ownerAccountId)}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-slate-900/70 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Active consumer</p>
                      <p className="mt-2 text-sm font-semibold text-slate-100">
                        {currentConsumer?.name ?? "No consumer selected"}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-slate-900/70 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Current listing</p>
                      <p className="mt-2 text-sm font-semibold text-slate-100">
                        {formatTokenAmount(selectedTicket.currentPrice)}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-slate-900/70 p-4 md:col-span-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Cap</p>
                      <p className="mt-2 text-sm font-semibold text-slate-100">
                        {formatTokenAmount(capAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <label className="block text-sm font-medium text-slate-200">
                      {isCurrentConsumerOwner ? "Listing price" : "Purchase price"}
                      <p className="mt-2 text-xs text-slate-400">
                        {isCurrentConsumerOwner
                          ? "The ticket remains in your account while listed. Ownership moves only after another consumer settles the trade."
                          : `You are buying as ${currentConsumer?.name ?? "the selected consumer"}. Purchased tickets are held in that account until the owner lists them again.`}
                      </p>
                    </label>

                    <label className="block text-sm font-medium text-slate-200">
                      {isCurrentConsumerOwner ? "Set resale price" : "Settlement amount"}
                      <div className="mt-2 flex items-center rounded-[18px] border border-white/10 bg-slate-900 px-4 py-3">
                        <input
                          className="w-full bg-transparent text-lg font-semibold text-slate-100 outline-none"
                          type="number"
                          min="0"
                          step="0.01"
                          value={settlementAmount}
                          onChange={(event) => setSettlementAmount(event.target.value)}
                          disabled={
                            !isCurrentConsumerOwner ||
                            selectedTicket.used ||
                            selectedTicketStatus === "check_in_pending" ||
                            resaleWindowClosed
                          }
                        />
                        <span className="text-sm text-slate-400">ETH</span>
                      </div>
                    </label>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full ${
                          exceedsCap ? "bg-red-500" : "bg-slate-900"
                        }`}
                        style={{
                          width: `${Math.min((parsedSettlementAmount / Math.max(capAmount, 0.01)) * 100 || 0, 100)}%`,
                        }}
                      />
                    </div>

                    <div
                      className={`rounded-[18px] border px-4 py-3 text-sm ${
                        selectedTicket.used
                          ? "border-stone-400/30 bg-stone-400/10 text-stone-200"
                          : exceedsCap
                            ? "border-red-400/30 bg-red-500/10 text-red-200"
                            : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                      }`}
                    >
                      {selectedTicket.used
                        ? "This ticket has already been checked in and can no longer be transferred."
                        : selectedTicketStatus === "check_in_pending"
                          ? "Gate validation is active. Resale is locked until check-in completes or the timer expires."
                        : resaleWindowClosed
                          ? `Resale closes ${getResaleCutoffHours()} hours before the event, so new transfers are blocked.`
                        : !hasValidSettlementAmount
                          ? "Enter a valid listing price greater than 0."
                        : exceedsCap
                          ? "The amount exceeds the 110% resale cap and cannot be submitted."
                          : isCurrentConsumerOwner
                            ? selectedTicket.listed
                              ? "This ticket is listed. It remains in your account while waiting for a buyer."
                              : "This ticket is currently held in your account. List it when you want to open it for resale."
                            : selectedTicket.listed
                              ? `This listing is open. ${currentConsumer?.name ?? "The selected consumer"} can buy it at the listed price.`
                              : "The current holder has not listed this ticket, so consumers cannot buy it yet."}
                    </div>

                    {isCurrentConsumerOwner ? (
                      <div className="grid gap-3 md:grid-cols-3">
                        <button
                          className={`w-full rounded-full px-4 py-3 text-sm font-semibold transition ${
                            selectedTicketStatus === "used" ||
                            selectedTicketStatus === "check_in_pending" ||
                            resaleWindowClosed ||
                            !hasValidSettlementAmount ||
                            exceedsCap
                              ? "cursor-not-allowed bg-slate-800 text-slate-500"
                              : "border border-emerald-400/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                          }`}
                          onClick={selectedTicket.listed ? handleUpdateListing : handleListTicket}
                          disabled={
                            selectedTicketStatus === "used" ||
                            selectedTicketStatus === "check_in_pending" ||
                            resaleWindowClosed ||
                            !hasValidSettlementAmount ||
                            exceedsCap
                          }
                        >
                          {selectedTicket.listed ? "Update listing" : "List for resale"}
                        </button>

                        <button
                          className={`w-full rounded-full px-4 py-3 text-sm font-semibold transition ${
                            selectedTicketStatus === "used" ||
                            selectedTicketStatus === "check_in_pending" ||
                            !selectedTicket.listed
                              ? "cursor-not-allowed bg-slate-800 text-slate-500"
                              : "border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                          }`}
                          onClick={handleCancelListing}
                          disabled={
                            selectedTicketStatus === "used" ||
                            selectedTicketStatus === "check_in_pending" ||
                            !selectedTicket.listed
                          }
                        >
                          Cancel listing
                        </button>

                        <button
                          className={`w-full rounded-full px-4 py-3 text-sm font-semibold transition ${
                            selectedTicketStatus === "used" || selectedTicketStatus === "check_in_pending"
                              ? "cursor-not-allowed bg-slate-800 text-slate-500"
                              : "border border-sky-400/30 bg-sky-400/10 text-sky-100 hover:bg-sky-400/15"
                          }`}
                          onClick={handleStartCheckIn}
                          disabled={selectedTicketStatus === "used" || selectedTicketStatus === "check_in_pending"}
                        >
                          {selectedTicketStatus === "check_in_pending" ? "Gate lock active" : "Start check-in"}
                        </button>
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        <button
                          className={`w-full rounded-full px-4 py-3 text-sm font-semibold transition ${
                            selectedTicketStatus === "used" ||
                            selectedTicketStatus === "check_in_pending" ||
                            resaleWindowClosed ||
                            !selectedTicket.listed
                              ? "cursor-not-allowed bg-slate-800 text-slate-500"
                              : "bg-sky-400 text-slate-950 hover:bg-sky-300"
                          }`}
                          onClick={handleSettle}
                          disabled={
                            selectedTicketStatus === "used" ||
                            selectedTicketStatus === "check_in_pending" ||
                            resaleWindowClosed ||
                            !selectedTicket.listed
                          }
                        >
                          Buy as {currentConsumer?.name ?? "selected consumer"}
                        </button>

                        <div className="rounded-[18px] border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
                          Listed tickets remain with the seller until settlement. After purchase, the ticket is held in your account by default.
                        </div>
                      </div>
                    )}

                    {panelMessage ? (
                      <div className="rounded-[18px] border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
                        {panelMessage}
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}
            </section>

            <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">My Inventory</p>
              <h2 className="mt-2 text-2xl font-semibold">
                {currentConsumer ? `${currentConsumer.name} ticket inventory` : "Consumer ticket inventory"}
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                Current holdings, transfer state, and ticket version history for the selected consumer identity.
              </p>

              <div className="mt-6 space-y-3">
                {currentConsumerInventory.length ? (
                  currentConsumerInventory.map((ticket) => {
                    const ticketStatus = getTicketStatus(ticket, nowMs);
                    const ticketRemainingSeconds = getCheckInRemainingSeconds(ticket, nowMs);
                    const ticketResaleClosed = isResaleWindowClosed(ticket, nowMs);

                    return (
                      <article
                        key={`inventory-${ticket.id}`}
                        className="rounded-[20px] border border-white/10 bg-slate-900/70 p-4"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-100">
                                #{ticket.id} · {ticket.artist}
                              </p>
                              <span className="rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-200">
                                Version v{ticket.version}
                              </span>
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-semibold ${ticketStatus === "check_in_pending" ? "border-amber-400/30 bg-amber-400/10 text-amber-100" : ticketStatus === "used" ? "border-stone-400/30 bg-stone-400/10 text-stone-200" : ticketStatus === "listed" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-white/5 text-slate-200"}`}
                              >
                                {statusLabel(ticketStatus)}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-300">{ticket.event}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                              {ticket.venue} · Seat {ticket.seat}
                            </p>
                          </div>

                          <div className="text-sm text-slate-300 md:text-right">
                            <p className="font-semibold text-slate-100">{formatTokenAmount(ticket.currentPrice)}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                              Event {ticket.date}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <div className="rounded-[16px] border border-white/10 bg-slate-950/70 p-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Original</p>
                            <p className="mt-2 text-sm font-semibold text-slate-100">
                              {formatTokenAmount(ticket.originalPrice)}
                            </p>
                          </div>
                          <div className="rounded-[16px] border border-white/10 bg-slate-950/70 p-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Resale cap</p>
                            <p className="mt-2 text-sm font-semibold text-emerald-300">
                              {formatTokenAmount(getTicketCap(ticket))}
                            </p>
                          </div>
                          <div className="rounded-[16px] border border-white/10 bg-slate-950/70 p-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Transfer rule</p>
                            <p className="mt-2 text-sm font-semibold text-slate-100">
                              {ticketResaleClosed
                                ? "Resale closed"
                                : ticket.listed
                                  ? "Open to market"
                                  : "Held in account"}
                            </p>
                          </div>
                        </div>

                        {ticketStatus === "check_in_pending" ? (
                          <p className="mt-3 text-xs text-amber-200">
                            Gate lock active. {formatRemainingSeconds(ticketRemainingSeconds)} remaining before transfer reopens.
                          </p>
                        ) : ticketResaleClosed ? (
                          <p className="mt-3 text-xs text-red-200">
                            Trading is closed because the event starts within {getResaleCutoffHours()} hours.
                          </p>
                        ) : (
                          <p className="mt-3 text-xs text-slate-400">
                            This ticket stays in the consumer account unless the holder lists it for resale.
                          </p>
                        )}
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-[20px] border border-dashed border-white/10 bg-slate-900/40 px-4 py-6 text-sm text-slate-400">
                    The selected consumer is not currently holding any tickets.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Virtual Accounts</p>
              <h2 className="mt-2 text-2xl font-semibold">Balance overview</h2>

              <div className="mt-6 space-y-3">
                {ledger.accounts.map((account) => (
                  <article
                    key={account.id}
                    className="rounded-[20px] border border-white/10 bg-slate-900/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${account.accent}`}>
                          {account.role}
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-100">{account.name}</p>
                      </div>
                      <p className="text-lg font-semibold text-slate-100">
                        {formatTokenAmount(account.balance)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

          </aside>
        </main>
      </div>
    </div>
  );
}
