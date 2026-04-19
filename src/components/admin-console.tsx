"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatRemainingSeconds,
  formatLedgerTime,
  formatTokenAmount,
  getCheckInRemainingSeconds,
  getAccountName,
  getResaleCutoffHours,
  getTicketCap,
  getTicketStatus,
  isResaleWindowClosed,
  markDemoTicketUsed,
  mintDemoTicket,
  readDemoLedgerState,
  resetDemoLedgerState,
  startDemoCheckIn,
  subscribeDemoLedger,
  type DemoLedgerState,
} from "@/lib/demo-ledger";

const initialMintForm = {
  ownerAccountId: "acct-lin",
  artist: "Taylor Swift",
  event: "The Eras Encore Session",
  seat: "A-01",
  originalPrice: "1.05",
  venue: "Singapore National Stadium",
  date: "2025-09-02 20:00",
  region: "International",
};

function statusTone(status: ReturnType<typeof getTicketStatus>) {
  if (status === "used") {
    return "border-stone-400/30 bg-stone-400/10 text-stone-200";
  }

  if (status === "check_in_pending") {
    return "border-amber-400/30 bg-amber-400/10 text-amber-100";
  }

  if (status === "listed") {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  }

  return "border-white/10 bg-slate-800 text-slate-200";
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

export function AdminConsole() {
  const [ledger, setLedger] = useState<DemoLedgerState>(() => readDemoLedgerState());
  const [mintForm, setMintForm] = useState(initialMintForm);
  const [usedTicketId, setUsedTicketId] = useState("");
  const [feedback, setFeedback] = useState("");
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

  const totalBalance = ledger.accounts.reduce((sum, account) => sum + account.balance, 0);
  const openTickets = ledger.tickets.filter(
    (ticket) =>
      getTicketStatus(ticket, nowMs) !== "used" &&
      getTicketStatus(ticket, nowMs) !== "check_in_pending" &&
      !isResaleWindowClosed(ticket, nowMs),
  ).length;
  const checkedInTickets = ledger.tickets.filter((ticket) => ticket.used).length;
  const gateLockCount = ledger.tickets.filter(
    (ticket) => getTicketStatus(ticket, nowMs) === "check_in_pending",
  ).length;
  const resaleClosedCount = ledger.tickets.filter((ticket) => isResaleWindowClosed(ticket, nowMs)).length;
  const latestActivity = ledger.activity[0];

  const handleMint = () => {
    try {
      mintDemoTicket({
        ownerAccountId: mintForm.ownerAccountId,
        artist: mintForm.artist,
        event: mintForm.event,
        seat: mintForm.seat,
        originalPrice: Number(mintForm.originalPrice),
        venue: mintForm.venue,
        date: mintForm.date,
        region: mintForm.region,
      });
      setFeedback("The ticket has been issued and synchronized across inventory and marketplace views.");
      setMintForm((current) => ({
        ...current,
        seat: current.seat === "A-01" ? "A-02" : "A-01",
      }));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Mint failed.");
    }
  };

  const handleCheckIn = () => {
    try {
      markDemoTicketUsed(Number(usedTicketId));
      setFeedback("The ticket is now checked in and future transfers are blocked.");
      setUsedTicketId("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Check-in failed.");
    }
  };

  const handleStartGateLock = () => {
    try {
      startDemoCheckIn(Number(usedTicketId));
      setFeedback("Gate validation started. The ticket is locked for transfer for 3 minutes.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to start gate validation.");
    }
  };

  const handleReset = () => {
    resetDemoLedgerState();
    setFeedback("The demo dataset has been reset to its initial state.");
    setMintForm(initialMintForm);
    setUsedTicketId("");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#050b16_50%,_#020617_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="rounded-[28px] border border-white/10 bg-slate-950/70 px-6 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">
                Operations Console
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                Virtual account back office
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                The back office now runs in virtual-account mode and does not depend on MetaMask.
                This page manages ticket issuance, check-in, and account changes, and every record
                is reflected back to the marketplace in real time.
              </p>
              <p className="mt-3 text-sm text-amber-200">
                Resale closes automatically {getResaleCutoffHours()} hours before each event begins.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-full border border-white/10 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/8"
              >
                Back to marketplace
              </Link>
              <button
                className="rounded-full bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                onClick={handleReset}
              >
                Reset demo data
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-5">
            <article className="rounded-[22px] border border-white/10 bg-slate-900/70 p-5">
              <p className="text-sm text-slate-400">Virtual accounts</p>
              <p className="mt-3 text-3xl font-semibold">{ledger.accounts.length}</p>
              <p className="mt-2 text-sm text-slate-400">Shared settlement participants</p>
            </article>
            <article className="rounded-[22px] border border-white/10 bg-slate-900/70 p-5">
              <p className="text-sm text-slate-400">Total balances</p>
              <p className="mt-3 text-3xl font-semibold">{formatTokenAmount(totalBalance)}</p>
              <p className="mt-2 text-sm text-slate-400">Demo treasury pool</p>
            </article>
            <article className="rounded-[22px] border border-white/10 bg-slate-900/70 p-5">
              <p className="text-sm text-slate-400">Open tickets</p>
              <p className="mt-3 text-3xl font-semibold">{openTickets}</p>
              <p className="mt-2 text-sm text-slate-400">Transfer-ready inventory</p>
            </article>
            <article className="rounded-[22px] border border-white/10 bg-slate-900/70 p-5">
              <p className="text-sm text-slate-400">Gate locks</p>
              <p className="mt-3 text-3xl font-semibold">{gateLockCount}</p>
              <p className="mt-2 text-sm text-slate-400">Tickets in active validation</p>
            </article>
            <article className="rounded-[22px] border border-white/10 bg-slate-900/70 p-5">
              <p className="text-sm text-slate-400">Resale closed</p>
              <p className="mt-3 text-3xl font-semibold">{resaleClosedCount}</p>
              <p className="mt-2 text-sm text-slate-400">Inside the final 8-hour window</p>
            </article>
          </div>
        </header>

        <main className="mt-8 grid flex-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6">
            <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Actions</p>
                  <h2 className="mt-2 text-2xl font-semibold">Issue and validate tickets</h2>
                </div>
                <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  Delivery-ready
                </div>
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <article className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
                  <p className="text-lg font-semibold text-slate-100">Issue ticket</p>
                  <div className="mt-4 space-y-4">
                    <label className="block text-sm font-medium text-slate-200">
                      Owner account
                      <select
                        className="mt-2 w-full rounded-[18px] border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                        value={mintForm.ownerAccountId}
                        onChange={(event) =>
                          setMintForm((current) => ({
                            ...current,
                            ownerAccountId: event.target.value,
                          }))
                        }
                      >
                        {ledger.accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm font-medium text-slate-200">
                      Artist
                      <input
                        className="mt-2 w-full rounded-[18px] border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                        value={mintForm.artist}
                        onChange={(event) =>
                          setMintForm((current) => ({ ...current, artist: event.target.value }))
                        }
                      />
                    </label>

                    <label className="block text-sm font-medium text-slate-200">
                      Event name
                      <input
                        className="mt-2 w-full rounded-[18px] border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                        value={mintForm.event}
                        onChange={(event) =>
                          setMintForm((current) => ({ ...current, event: event.target.value }))
                        }
                      />
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-200">
                        Seat
                        <input
                          className="mt-2 w-full rounded-[18px] border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                          value={mintForm.seat}
                          onChange={(event) =>
                            setMintForm((current) => ({ ...current, seat: event.target.value }))
                          }
                        />
                      </label>
                      <label className="block text-sm font-medium text-slate-200">
                        Original price
                        <input
                          className="mt-2 w-full rounded-[18px] border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
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

                    <label className="block text-sm font-medium text-slate-200">
                      Venue
                      <input
                        className="mt-2 w-full rounded-[18px] border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                        value={mintForm.venue}
                        onChange={(event) =>
                          setMintForm((current) => ({ ...current, venue: event.target.value }))
                        }
                      />
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-200">
                        Event date
                        <input
                          className="mt-2 w-full rounded-[18px] border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                          value={mintForm.date}
                          onChange={(event) =>
                            setMintForm((current) => ({ ...current, date: event.target.value }))
                          }
                        />
                      </label>
                      <label className="block text-sm font-medium text-slate-200">
                        Region
                        <input
                          className="mt-2 w-full rounded-[18px] border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                          value={mintForm.region}
                          onChange={(event) =>
                            setMintForm((current) => ({ ...current, region: event.target.value }))
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <button
                    className="mt-5 w-full rounded-full bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                    onClick={handleMint}
                  >
                    Issue ticket into demo ledger
                  </button>
                </article>

                <article className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
                  <p className="text-lg font-semibold text-slate-100">Check in ticket</p>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    Start gate validation first to lock the ticket for 3 minutes. During that window
                    resale is blocked. Then confirm the final check-in to end the ticket lifecycle.
                  </p>

                  <label className="mt-5 block text-sm font-medium text-slate-200">
                    Ticket ID
                    <input
                      className="mt-2 w-full rounded-[18px] border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                      type="number"
                      min="1"
                      step="1"
                      value={usedTicketId}
                      onChange={(event) => setUsedTicketId(event.target.value)}
                      placeholder="101"
                    />
                  </label>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <button
                      className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                      onClick={handleStartGateLock}
                    >
                      Start gate lock
                    </button>

                    <button
                      className="w-full rounded-full border border-white/10 bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                      onClick={handleCheckIn}
                    >
                      Mark ticket as used
                    </button>
                  </div>

                  <div className="mt-6 rounded-[20px] border border-white/10 bg-slate-950 p-4 text-sm text-slate-300">
                    <p className="font-semibold text-slate-100">Current operation state</p>
                    <p className="mt-2">
                      {latestActivity ? latestActivity.detail : "Waiting for the next operation."}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                      {latestActivity ? formatLedgerTime(latestActivity.createdAt) : "Idle"}
                    </p>
                  </div>
                </article>
              </div>

              {feedback ? (
                <div className="mt-5 rounded-[18px] border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
                  {feedback}
                </div>
              ) : null}
            </section>

            <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Ticket Inventory</p>
                  <h2 className="mt-2 text-2xl font-semibold">Operational ticket state</h2>
                </div>
                <p className="text-sm text-slate-400">
                  {ledger.tickets.length} tickets tracked · {checkedInTickets} checked in
                </p>
              </div>

              <div className="mt-6 space-y-3">
                {ledger.tickets.map((ticket) => {
                  const ticketStatus = getTicketStatus(ticket, nowMs);
                  const remainingSeconds = getCheckInRemainingSeconds(ticket, nowMs);
                  const resaleClosed = isResaleWindowClosed(ticket, nowMs);

                  return (
                    <article
                      key={ticket.id}
                      className="rounded-[22px] border border-white/10 bg-slate-900/70 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-100">#{ticket.id}</span>
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(ticketStatus)}`}
                            >
                              {statusLabel(ticketStatus)}
                            </span>
                            {ticketStatus === "check_in_pending" ? (
                              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-100">
                                {formatRemainingSeconds(remainingSeconds)} left
                              </span>
                            ) : null}
                            {resaleClosed ? (
                              <span className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200">
                                Resale closed
                              </span>
                            ) : null}
                          </div>
                          <h3 className="mt-3 text-lg font-semibold text-slate-100">{ticket.event}</h3>
                          <p className="mt-1 text-sm text-slate-300">
                            {ticket.artist} · {ticket.venue} · Seat {ticket.seat}
                          </p>
                          {ticketStatus === "check_in_pending" ? (
                            <p className="mt-2 text-xs text-amber-200">
                              Gate validation is active. Transfers resume automatically when the timer expires.
                            </p>
                          ) : resaleClosed ? (
                            <p className="mt-2 text-xs text-red-200">
                              This ticket is inside the final {getResaleCutoffHours()}-hour window and can no longer be listed or sold.
                            </p>
                          ) : null}
                        </div>

                        <div className="grid gap-2 text-sm text-slate-300 md:text-right">
                          <p>Owner: <span className="font-semibold text-slate-100">{getAccountName(ledger, ticket.ownerAccountId)}</span></p>
                          <p>Current: <span className="font-semibold text-slate-100">{formatTokenAmount(ticket.currentPrice)}</span></p>
                          <p>Cap: <span className="font-semibold text-slate-100">{formatTokenAmount(getTicketCap(ticket))}</span></p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Accounts</p>
              <h2 className="mt-2 text-2xl font-semibold">Virtual balance board</h2>

              <div className="mt-6 space-y-3">
                {ledger.accounts.map((account) => (
                  <article
                    key={account.id}
                    className="rounded-[20px] border border-white/10 bg-slate-900/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{account.name}</p>
                        <p className="mt-1 text-sm text-slate-400">{account.role}</p>
                      </div>
                      <p className="text-lg font-semibold text-slate-100">
                        {formatTokenAmount(account.balance)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Ledger Feed</p>
                  <h2 className="mt-2 text-2xl font-semibold">Recent backend records</h2>
                </div>
                <p className="text-sm text-slate-400">{ledger.activity.length} entries</p>
              </div>

              <div className="mt-6 space-y-3">
                {ledger.activity.slice(0, 8).map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[20px] border border-white/10 bg-slate-900/70 p-4"
                  >
                    <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-300">{item.detail}</p>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                      <span>{formatTokenAmount(item.amount)}</span>
                      <span>{formatLedgerTime(item.createdAt)}</span>
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
