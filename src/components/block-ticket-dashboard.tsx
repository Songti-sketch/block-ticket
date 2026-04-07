"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type ProvenanceStep = {
  label: string;
  value: string;
};

type Ticket = {
  id: number;
  artist: string;
  event: string;
  seat: string;
  owner: string;
  originalPrice: number;
  currentPrice: number;
  venue: string;
  date: string;
  listed: boolean;
  region: string;
  imageSrc?: string;
  accent: string;
  provenance: ProvenanceStep[];
};

const tickets: Ticket[] = [
  {
    id: 101,
    artist: "五月天 Mayday",
    event: "Just Love It 银河特别场",
    seat: "A-12",
    owner: "0xA1cE...92F4",
    originalPrice: 0.68,
    currentPrice: 0.72,
    venue: "香港启德体育园",
    date: "May 18, 2025",
    listed: true,
    region: "Greater China",
    imageSrc: "/artists/may.jpeg",
    accent: "from-cyan-300 via-sky-400 to-indigo-500",
    provenance: [
      { label: "Minted", value: "Organizer → Fan Presale" },
      { label: "Resale #1", value: "0.70 ETH at +2.9%" },
      { label: "Rule Check", value: "Cap preserved" },
    ],
  },
  {
    id: 102,
    artist: "陈奕迅 Eason Chan",
    event: "Fear and Dreams Final Encore",
    seat: "VIP-03",
    owner: "0xL0ve...E520",
    originalPrice: 0.92,
    currentPrice: 0.97,
    venue: "澳门银河综艺馆",
    date: "Jun 07, 2025",
    listed: true,
    region: "Greater China",
    imageSrc: "/artists/easonChen.jpg",
    accent: "from-fuchsia-400 via-pink-400 to-rose-500",
    provenance: [
      { label: "Minted", value: "Organizer → Priority Queue" },
      { label: "Resale #1", value: "0.95 ETH at +3.3%" },
      { label: "Wallet Scan", value: "Ownership verified" },
    ],
  },
  {
    id: 201,
    artist: "Coldplay",
    event: "Moon Music Stadium Run",
    seat: "B-04",
    owner: "0xC0de...77B1",
    originalPrice: 1.18,
    currentPrice: 1.24,
    venue: "Tokyo Dome",
    date: "Jul 02, 2025",
    listed: true,
    region: "International",
    accent: "from-emerald-300 via-teal-400 to-cyan-500",
    provenance: [
      { label: "Minted", value: "Organizer → General Sale" },
      { label: "Resale #1", value: "1.22 ETH at +3.4%" },
      { label: "Provenance", value: "2 transfers total" },
    ],
  },
  {
    id: 202,
    artist: "Arctic Monkeys",
    event: "Tranquility Encore Night",
    seat: "C-19",
    owner: "0x9fB2...A660",
    originalPrice: 0.84,
    currentPrice: 0.84,
    venue: "Singapore Indoor Stadium",
    date: "Aug 15, 2025",
    listed: false,
    region: "International",
    accent: "from-violet-400 via-indigo-400 to-blue-500",
    provenance: [
      { label: "Minted", value: "Organizer → Fan Club" },
      { label: "Resale #1", value: "No resale yet" },
      { label: "Gate Status", value: "Unused" },
    ],
  },
];

const connectedWallet = "0xA1cE...92F4";

function formatEth(value: number) {
  return `${value.toFixed(2)} ETH`;
}

function getCap(ticket: Ticket) {
  return Number((ticket.originalPrice * 1.1).toFixed(2));
}

function getUsageRatio(ticket: Ticket) {
  return Math.min((ticket.currentPrice / getCap(ticket)) * 100, 100);
}

function getHeadroom(ticket: Ticket) {
  return Math.max(getCap(ticket) - ticket.currentPrice, 0);
}

function makeQrMatrix(seed: string) {
  const chars = seed.split("");

  return Array.from({ length: 25 }, (_, index) => {
    const source = chars[index % chars.length] ?? "0";
    return (source.charCodeAt(0) + index * 7) % 3 !== 0;
  });
}

export function BlockTicketDashboard() {
  const [selectedTicket, setSelectedTicket] = useState<Ticket>(tickets[0]);
  const [resaleInput, setResaleInput] = useState(tickets[0].currentPrice.toFixed(2));
  const [validatorTick, setValidatorTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setValidatorTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const effectiveTick = validatorTick || 30000;
  const maxAllowed = useMemo(() => getCap(selectedTicket), [selectedTicket]);
  const parsedResaleInput = Number(resaleInput || 0);
  const exceedsCap = parsedResaleInput > maxAllowed;
  const currentWindow = Math.floor(effectiveTick / 30000);
  const validatorSeed = `${selectedTicket.id}-${currentWindow}-${selectedTicket.owner}`;
  const validatorMatrix = useMemo(() => makeQrMatrix(validatorSeed), [validatorSeed]);
  const nextRefreshSeconds = 30 - Math.floor((effectiveTick / 1000) % 30);
  const listedCount = tickets.filter((ticket) => ticket.listed).length;
  const greaterChinaCount = tickets.filter((ticket) => ticket.region === "Greater China").length;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(68,211,255,0.18),_transparent_30%),radial-gradient(circle_at_right,_rgba(217,70,239,0.16),_transparent_35%),linear-gradient(180deg,_#020617_0%,_#071225_50%,_#0f172a_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="rounded-[32px] border border-white/10 bg-white/8 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/70">Block Ticket</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
                Trusted resale for NFT concert tickets
              </h1>
              <p className="mt-4 text-sm leading-7 text-slate-300 md:text-base">
                A delivery-ready marketplace experience that helps fans compare face value,
                resale limits, ownership history, and validator-ready entry credentials in
                a single view.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
                Connected Wallet: <span className="font-semibold">{connectedWallet}</span>
              </div>
              <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                Hard cap active: <span className="font-semibold">110% of original price</span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-[24px] border border-white/10 bg-slate-950/45 p-5">
              <p className="text-sm text-slate-400">Live listings</p>
              <p className="mt-3 text-3xl font-semibold">{listedCount}</p>
              <p className="mt-2 text-sm text-slate-300">Protected by on-chain cap</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-slate-950/45 p-5">
              <p className="text-sm text-slate-400">Greater China cases</p>
              <p className="mt-3 text-3xl font-semibold">{greaterChinaCount}</p>
                <p className="mt-2 text-sm text-slate-300">With real artist photos</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-slate-950/45 p-5">
                <p className="text-sm text-slate-400">Selected ticket cap</p>
              <p className="mt-3 text-3xl font-semibold">{formatEth(maxAllowed)}</p>
              <p className="mt-2 text-sm text-slate-300">Original × 110%</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-slate-950/45 p-5">
              <p className="text-sm text-slate-400">Validator refresh</p>
              <p className="mt-3 text-3xl font-semibold">{nextRefreshSeconds}s</p>
              <p className="mt-2 text-sm text-slate-300">Rolling check-in code</p>
            </div>
          </div>
        </header>

        <main className="mt-8 grid flex-1 gap-6 xl:grid-cols-[1.45fr_0.95fr]">
          <section className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">
                Marketplace
              </span>
              <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-slate-300">
                Price Transparency
              </span>
              <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-slate-300">
                Provenance + Entry Pass
              </span>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {tickets.map((ticket) => {
                const maxCap = getCap(ticket);
                const usageRatio = getUsageRatio(ticket);
                const headroom = getHeadroom(ticket);
                const isSelected = selectedTicket.id === ticket.id;

                return (
                  <div key={ticket.id} className="[perspective:1600px]">
                    <div className="group relative h-[530px] w-full [transform-style:preserve-3d] transition duration-700 hover:[transform:rotateY(180deg)]">
                      <article
                        className={`absolute inset-0 rounded-[30px] border p-5 shadow-2xl backdrop-blur-xl [backface-visibility:hidden] ${
                          isSelected
                            ? "border-cyan-300/50 bg-slate-950/70 shadow-cyan-950/40"
                            : "border-white/10 bg-slate-950/55"
                        }`}
                      >
                        <div className="relative h-56 overflow-hidden rounded-[24px]">
                          {ticket.imageSrc ? (
                            <Image
                              src={ticket.imageSrc}
                              alt={ticket.artist}
                              fill
                              className="object-cover"
                              sizes="(max-width: 1024px) 100vw, 33vw"
                            />
                          ) : (
                            <div
                              className={`flex h-full items-end bg-gradient-to-br ${ticket.accent} p-5`}
                            >
                              <div>
                                <p className="text-sm uppercase tracking-[0.35em] text-slate-950/70">
                                  {ticket.region}
                                </p>
                                <p className="mt-2 text-3xl font-semibold text-slate-950">
                                  {ticket.artist}
                                </p>
                              </div>
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent p-5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs uppercase tracking-[0.28em] text-slate-100">
                                {ticket.region}
                              </span>
                              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-emerald-200">
                                NFT #{ticket.id}
                              </span>
                            </div>
                            <h2 className="mt-3 text-2xl font-semibold">{ticket.artist}</h2>
                            <p className="mt-1 text-sm text-slate-200">{ticket.event}</p>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-4 text-sm text-slate-300">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-[18px] border border-white/10 bg-white/6 p-4">
                              <p className="text-slate-400">Venue</p>
                              <p className="mt-1 font-medium text-white">{ticket.venue}</p>
                            </div>
                            <div className="rounded-[18px] border border-white/10 bg-white/6 p-4">
                              <p className="text-slate-400">Seat</p>
                              <p className="mt-1 font-medium text-white">{ticket.seat}</p>
                            </div>
                          </div>

                          <div className="rounded-[20px] border border-white/10 bg-white/6 p-4">
                            <div className="flex items-center justify-between">
                              <p className="text-slate-400">Original Price</p>
                              <p className="font-semibold text-white">{formatEth(ticket.originalPrice)}</p>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <p className="text-slate-400">Resale Cap</p>
                              <p className="font-semibold text-emerald-300">{formatEth(maxCap)}</p>
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                              <p className="text-slate-400">Current Listing</p>
                              <p className="font-semibold text-cyan-300">{formatEth(ticket.currentPrice)}</p>
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
                                Remaining headroom: {formatEth(headroom)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                              Current owner
                            </p>
                            <p className="mt-1 text-sm text-slate-200">{ticket.owner}</p>
                          </div>
                          <button
                            className="rounded-full bg-gradient-to-r from-cyan-300 to-fuchsia-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01]"
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setResaleInput(ticket.currentPrice.toFixed(2));
                            }}
                          >
                            Open Resale Panel
                          </button>
                        </div>
                      </article>

                      <article className="absolute inset-0 rounded-[30px] border border-white/10 bg-slate-950/85 p-5 shadow-2xl backdrop-blur-xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
                        <div className="flex h-full flex-col">
                          <div className={`rounded-[24px] bg-gradient-to-br ${ticket.accent} p-[1px]`}>
                            <div className="rounded-[23px] bg-slate-950/95 p-5">
                              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">
                                Provenance
                              </p>
                              <h3 className="mt-2 text-2xl font-semibold">{ticket.artist}</h3>
                              <p className="mt-1 text-sm text-slate-300">{ticket.event}</p>
                            </div>
                          </div>

                          <div className="mt-5 grid gap-3">
                            {ticket.provenance.map((step) => (
                              <div
                                key={`${ticket.id}-${step.label}`}
                                className="rounded-[18px] border border-white/10 bg-white/6 p-4"
                              >
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                                  {step.label}
                                </p>
                                <p className="mt-2 text-sm text-slate-200">{step.value}</p>
                              </div>
                            ))}
                          </div>

                          <div className="mt-5 grid flex-1 gap-5 md:grid-cols-[1fr_140px]">
                            <div className="rounded-[20px] border border-white/10 bg-white/6 p-4">
                              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                                Ticket meta
                              </p>
                              <div className="mt-3 space-y-3 text-sm text-slate-300">
                                <div className="flex items-center justify-between">
                                  <span>Date</span>
                                  <span className="text-white">{ticket.date}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Status</span>
                                  <span className="text-emerald-300">
                                    {ticket.listed ? "Listed under cap" : "Held by owner"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Validator tag</span>
                                  <span className="text-cyan-300">Rolling signature ready</span>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-[20px] border border-white/10 bg-white/6 p-4">
                              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                                Entry Pass
                              </p>
                              <div className="mt-3 grid grid-cols-5 gap-1">
                                {makeQrMatrix(`${ticket.id}-${ticket.artist}`).map((active, index) => (
                                  <div
                                    key={`${ticket.id}-qr-${index}`}
                                    className={`aspect-square rounded-[4px] ${
                                      active ? "bg-white" : "bg-slate-700"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[30px] border border-white/10 bg-white/8 p-6 backdrop-blur-xl">
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/70">Resale Panel</p>
              <h2 className="mt-2 text-2xl font-semibold">{selectedTicket.artist}</h2>
              <p className="mt-2 text-sm text-slate-300">
                {selectedTicket.event} · {selectedTicket.venue} · Seat {selectedTicket.seat}
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-[18px] border border-white/10 bg-slate-950/45 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Original</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {formatEth(selectedTicket.originalPrice)}
                  </p>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-slate-950/45 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Cap</p>
                  <p className="mt-2 text-lg font-semibold text-emerald-300">
                    {formatEth(maxAllowed)}
                  </p>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-slate-950/45 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Now</p>
                  <p className="mt-2 text-lg font-semibold text-cyan-300">
                    {formatEth(selectedTicket.currentPrice)}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[22px] border border-white/10 bg-slate-950/55 p-5">
                <label className="text-sm font-medium text-slate-200">Set resale price</label>
                <div className="mt-3 flex items-center rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
                  <input
                    className="w-full bg-transparent text-lg font-semibold text-white outline-none"
                    type="number"
                    min="0"
                    step="0.01"
                    value={resaleInput}
                    onChange={(event) => setResaleInput(event.target.value)}
                  />
                  <span className="text-sm text-slate-400">ETH</span>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full ${
                      exceedsCap ? "bg-red-400" : "bg-gradient-to-r from-emerald-300 to-cyan-300"
                    }`}
                    style={{
                      width: `${Math.min((parsedResaleInput / maxAllowed) * 100 || 0, 100)}%`,
                    }}
                  />
                </div>

                <div
                  className={`mt-4 rounded-[18px] border px-4 py-3 text-sm ${
                    exceedsCap
                      ? "border-red-400/35 bg-red-500/10 text-red-200"
                      : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                  }`}
                >
                  {exceedsCap
                    ? "根据 Block Ticket 协议，转售价不得超过原价的 110% 以保护粉丝权益。"
                    : "This listing stays within the protocol cap and is ready for submission."}
                </div>

                <div className="mt-5 flex gap-3">
                  <button
                    className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold transition ${
                      exceedsCap
                        ? "cursor-not-allowed bg-red-500/20 text-red-200"
                        : "bg-gradient-to-r from-cyan-300 to-fuchsia-400 text-slate-950 hover:scale-[1.01]"
                    }`}
                    disabled={exceedsCap}
                  >
                    Submit capped resale
                  </button>
                  <button className="rounded-full border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/8">
                    Reset input
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-white/8 p-6 backdrop-blur-xl">
              <p className="text-sm uppercase tracking-[0.28em] text-fuchsia-200/70">Validator Portal</p>
              <h2 className="mt-2 text-2xl font-semibold">Dynamic check-in credential</h2>
              <p className="mt-3 text-sm text-slate-300">
                A rolling validator signature reduces screenshot fraud by changing every
                30 seconds.
              </p>

              <div className="mt-5 grid gap-5 md:grid-cols-[1fr_150px]">
                <div className="rounded-[20px] border border-white/10 bg-slate-950/50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-400">Selected token</p>
                    <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                      #{selectedTicket.id}
                    </span>
                  </div>
                  <p className="mt-3 text-lg font-semibold">{selectedTicket.artist}</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Signature seed:{" "}
                    <span className="font-mono text-cyan-300">{validatorSeed}</span>
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Refresh in {nextRefreshSeconds}s · owner {selectedTicket.owner}
                  </p>
                </div>

                <div className="rounded-[20px] border border-white/10 bg-white/6 p-4">
                  <div className="grid grid-cols-5 gap-1">
                    {validatorMatrix.map((active, index) => (
                      <div
                        key={`validator-${index}`}
                        className={`aspect-square rounded-[4px] ${
                          active ? "bg-white" : "bg-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-[20px] border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
                <p className="font-semibold text-white">Validator checklist</p>
                <ul className="mt-3 space-y-2">
                  <li>Token ownership matches current wallet signature</li>
                  <li>Ticket status is unused and transferable</li>
                  <li>Signature refresh window is still valid</li>
                </ul>
              </div>
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
}
