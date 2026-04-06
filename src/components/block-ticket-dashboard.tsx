"use client";

import { useMemo, useState } from "react";

type Ticket = {
  id: number;
  event: string;
  seat: string;
  owner: string;
  originalPrice: number;
  currentPrice: number;
  venue: string;
  date: string;
  listed: boolean;
};

const mockTickets: Ticket[] = [
  {
    id: 1,
    event: "Seoul Synth Fest",
    seat: "A-12",
    owner: "0xA1cE...92F4",
    originalPrice: 0.8,
    currentPrice: 0.84,
    venue: "Jamsil Arena",
    date: "Apr 18, 2025",
    listed: true,
  },
  {
    id: 2,
    event: "Neon City Finals",
    seat: "B-04",
    owner: "0xC0de...77B1",
    originalPrice: 1.2,
    currentPrice: 1.2,
    venue: "Inspire Dome",
    date: "May 02, 2025",
    listed: false,
  },
  {
    id: 3,
    event: "BlockWave Summit",
    seat: "VIP-02",
    owner: "0x9fB2...A660",
    originalPrice: 1.5,
    currentPrice: 1.62,
    venue: "Harbor Convention Hall",
    date: "May 19, 2025",
    listed: true,
  },
];

const connectedWallet = "0xA1cE...92F4";

function formatEth(price: number) {
  return `${price.toFixed(2)} ETH`;
}

export function BlockTicketDashboard() {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(mockTickets[0]);
  const [resaleInput, setResaleInput] = useState(mockTickets[0].currentPrice.toFixed(2));

  const maxAllowed = useMemo(() => {
    if (!selectedTicket) {
      return 0;
    }

    return Number((selectedTicket.originalPrice * 1.1).toFixed(2));
  }, [selectedTicket]);

  const parsedResaleInput = Number(resaleInput || 0);
  const exceedsCap = selectedTicket ? parsedResaleInput > maxAllowed : false;
  const marketVolume = mockTickets.reduce((sum, ticket) => sum + ticket.currentPrice, 0);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(110,76,255,0.22),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(0,229,255,0.16),_transparent_28%),linear-gradient(180deg,_#050816_0%,_#0b1120_54%,_#111827_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/8 p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/70">Block Ticket</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              Anti-scalping NFT ticket marketplace MVP
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300 md:text-base">
              Smart-contract resale enforcement keeps every ticket capped at 110% of
              the organizer&apos;s original mint price.
            </p>
          </div>

          <button className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-medium text-cyan-100 shadow-lg shadow-cyan-950/20 transition hover:border-cyan-300/50 hover:bg-cyan-300/15">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Connect Wallet
            <span className="rounded-full bg-slate-950/60 px-3 py-1 text-slate-200">
              {connectedWallet}
            </span>
          </button>
        </header>

        <main className="mt-8 grid flex-1 gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <section className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[26px] border border-white/10 bg-white/8 p-5 backdrop-blur-xl">
                <p className="text-sm text-slate-300">Tickets listed</p>
                <p className="mt-4 text-3xl font-semibold">{mockTickets.length}</p>
                <p className="mt-2 text-sm text-emerald-300">2 protected resale offers live</p>
              </div>
              <div className="rounded-[26px] border border-white/10 bg-white/8 p-5 backdrop-blur-xl">
                <p className="text-sm text-slate-300">Protected cap</p>
                <p className="mt-4 text-3xl font-semibold">110%</p>
                <p className="mt-2 text-sm text-slate-300">Hard stop enforced on-chain</p>
              </div>
              <div className="rounded-[26px] border border-white/10 bg-white/8 p-5 backdrop-blur-xl">
                <p className="text-sm text-slate-300">Market volume</p>
                <p className="mt-4 text-3xl font-semibold">{formatEth(marketVolume)}</p>
                <p className="mt-2 text-sm text-cyan-300">Mock blockchain snapshot</p>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/8 p-6 backdrop-blur-xl">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-fuchsia-200/70">
                    Marketplace
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">Ticket marketplace grid</h2>
                </div>
                <p className="text-sm text-slate-300">
                  Showing event, seat, current owner, and capped resale pricing.
                </p>
              </div>

              <div className="mt-6 grid gap-4">
                {mockTickets.map((ticket) => {
                  const cap = Number((ticket.originalPrice * 1.1).toFixed(2));
                  const isOwnedByConnectedWallet = ticket.owner === connectedWallet;

                  return (
                    <article
                      key={ticket.id}
                      className="grid gap-4 rounded-[24px] border border-white/10 bg-slate-950/40 p-5 transition hover:border-cyan-300/30 hover:bg-slate-950/55 md:grid-cols-[1.5fr_1fr_auto]"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-semibold">{ticket.event}</h3>
                          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-emerald-200">
                            NFT #{ticket.id}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-slate-300">
                          {ticket.venue} • {ticket.date}
                        </p>
                        <div className="mt-5 grid gap-3 text-sm text-slate-200 sm:grid-cols-3">
                          <div>
                            <p className="text-slate-400">Seat</p>
                            <p className="mt-1 font-medium">{ticket.seat}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Current owner</p>
                            <p className="mt-1 font-medium">{ticket.owner}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Original price</p>
                            <p className="mt-1 font-medium">{formatEth(ticket.originalPrice)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/10 bg-white/6 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                          Pricing
                        </p>
                        <p className="mt-4 text-3xl font-semibold">{formatEth(ticket.currentPrice)}</p>
                        <p className="mt-2 text-sm text-slate-300">
                          Cap: {formatEth(cap)} max resale
                        </p>
                        <div className="mt-4 inline-flex rounded-full border border-white/10 bg-slate-950/55 px-3 py-1 text-xs text-slate-300">
                          {ticket.listed ? "Listed for resale" : "Held by owner"}
                        </div>
                      </div>

                      <div className="flex items-center justify-start md:justify-end">
                        <button
                          className="rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-fuchsia-950/30 transition hover:scale-[1.01]"
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setResaleInput(ticket.currentPrice.toFixed(2));
                          }}
                        >
                          {isOwnedByConnectedWallet ? "Open resale modal" : "Inspect rules"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-[30px] border border-white/10 bg-white/8 p-6 backdrop-blur-xl">
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/70">Resale</p>
              <h2 className="mt-2 text-2xl font-semibold">Dynamic resale modal</h2>
              <p className="mt-3 text-sm text-slate-300">
                Frontend warning mirrors the contract rule before a user signs anything.
              </p>

              {selectedTicket ? (
                <div className="mt-6 rounded-[24px] border border-white/10 bg-slate-950/55 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold">{selectedTicket.event}</p>
                      <p className="mt-1 text-sm text-slate-300">
                        Seat {selectedTicket.seat} • owned by {selectedTicket.owner}
                      </p>
                    </div>
                    <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-fuchsia-200">
                      Modal open
                    </span>
                  </div>

                  <div className="mt-6 grid gap-4 rounded-[20px] border border-white/10 bg-white/6 p-4 text-sm text-slate-300">
                    <div className="flex items-center justify-between">
                      <span>Original mint price</span>
                      <span className="font-medium text-white">
                        {formatEth(selectedTicket.originalPrice)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Maximum allowed by contract</span>
                      <span className="font-medium text-emerald-300">{formatEth(maxAllowed)}</span>
                    </div>
                  </div>

                  <label className="mt-6 block text-sm font-medium text-slate-200">
                    Enter resale price
                  </label>
                  <div className="mt-3 flex items-center rounded-[18px] border border-white/10 bg-slate-950/70 px-4 py-3">
                    <input
                      className="w-full bg-transparent text-lg font-semibold text-white outline-none placeholder:text-slate-500"
                      type="number"
                      min="0"
                      step="0.01"
                      value={resaleInput}
                      onChange={(event) => setResaleInput(event.target.value)}
                    />
                    <span className="text-sm text-slate-400">ETH</span>
                  </div>

                  <div
                    className={`mt-4 rounded-[18px] border px-4 py-3 text-sm ${
                      exceedsCap
                        ? "border-red-400/40 bg-red-500/10 text-red-200"
                        : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                    }`}
                  >
                    {exceedsCap
                      ? "Price exceeds 110% cap. The smart contract would revert with “Price exceeds scalping cap”."
                      : "Price is within the protected resale band and matches the contract rule."}
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold transition ${
                        exceedsCap
                          ? "cursor-not-allowed bg-red-500/20 text-red-200"
                          : "bg-gradient-to-r from-emerald-300 to-cyan-300 text-slate-950 hover:scale-[1.01]"
                      }`}
                      disabled={exceedsCap}
                    >
                      Simulate capped resale
                    </button>
                    <button className="rounded-full border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/8">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/8 p-6 backdrop-blur-xl">
              <p className="text-sm uppercase tracking-[0.28em] text-emerald-200/70">Contract rules</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li>Organizer mints ERC-721 tickets with an immutable original price.</li>
                <li>Holders list tickets for resale only if the price stays at or below 110%.</li>
                <li>Buyers call `resaleTicket()` to complete the trade under the cap.</li>
                <li>Anything above the cap reverts instantly on-chain.</li>
              </ul>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
