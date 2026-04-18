"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatLedgerTime,
  formatTokenAmount,
  getAccountName,
  getTicketCap,
  markDemoTicketUsed,
  mintDemoTicket,
  readDemoLedgerState,
  resetDemoLedgerState,
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

function statusTone(listed: boolean, used: boolean) {
  if (used) {
    return "border-stone-300 bg-stone-100 text-stone-700";
  }

  if (listed) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

export function AdminConsole() {
  const [ledger, setLedger] = useState<DemoLedgerState>(() => readDemoLedgerState());
  const [mintForm, setMintForm] = useState(initialMintForm);
  const [usedTicketId, setUsedTicketId] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    return subscribeDemoLedger((state) => {
      setLedger(state);
    });
  }, []);

  const totalBalance = ledger.accounts.reduce((sum, account) => sum + account.balance, 0);
  const openTickets = ledger.tickets.filter((ticket) => !ticket.used).length;
  const checkedInTickets = ledger.tickets.filter((ticket) => ticket.used).length;
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
      setFeedback("新票已发出，后台库存和前端市场视图已同步。");
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
      setFeedback("票券已标记为核销，后续转移会被系统阻止。");
      setUsedTicketId("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Check-in failed.");
    }
  };

  const handleReset = () => {
    resetDemoLedgerState();
    setFeedback("演示数据已重置为初始状态。");
    setMintForm(initialMintForm);
    setUsedTicketId("");
  };

  return (
    <div className="min-h-screen bg-[#eef2f7] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-700">
                Operations Console
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                Virtual account back office
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                后台已切换为虚拟账号模式，不依赖 MetaMask。这里负责管理票券发放、核销和账户变更，
                所有记录会实时反馈到前端市场页。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Back to marketplace
              </Link>
              <button
                className="rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                onClick={handleReset}
              >
                Reset demo data
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <article className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Virtual accounts</p>
              <p className="mt-3 text-3xl font-semibold">{ledger.accounts.length}</p>
              <p className="mt-2 text-sm text-slate-500">Shared settlement participants</p>
            </article>
            <article className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Total balances</p>
              <p className="mt-3 text-3xl font-semibold">{formatTokenAmount(totalBalance)}</p>
              <p className="mt-2 text-sm text-slate-500">Demo treasury pool</p>
            </article>
            <article className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Open tickets</p>
              <p className="mt-3 text-3xl font-semibold">{openTickets}</p>
              <p className="mt-2 text-sm text-slate-500">Transferable inventory</p>
            </article>
            <article className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Checked in</p>
              <p className="mt-3 text-3xl font-semibold">{checkedInTickets}</p>
              <p className="mt-2 text-sm text-slate-500">Permanently locked</p>
            </article>
          </div>
        </header>

        <main className="mt-8 grid flex-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Actions</p>
                  <h2 className="mt-2 text-2xl font-semibold">Issue and validate tickets</h2>
                </div>
                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Delivery-ready
                </div>
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-lg font-semibold text-slate-900">Issue ticket</p>
                  <div className="mt-4 space-y-4">
                    <label className="block text-sm font-medium text-slate-700">
                      Owner account
                      <select
                        className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 outline-none"
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

                    <label className="block text-sm font-medium text-slate-700">
                      Artist
                      <input
                        className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 outline-none"
                        value={mintForm.artist}
                        onChange={(event) =>
                          setMintForm((current) => ({ ...current, artist: event.target.value }))
                        }
                      />
                    </label>

                    <label className="block text-sm font-medium text-slate-700">
                      Event name
                      <input
                        className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 outline-none"
                        value={mintForm.event}
                        onChange={(event) =>
                          setMintForm((current) => ({ ...current, event: event.target.value }))
                        }
                      />
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Seat
                        <input
                          className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 outline-none"
                          value={mintForm.seat}
                          onChange={(event) =>
                            setMintForm((current) => ({ ...current, seat: event.target.value }))
                          }
                        />
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Original price
                        <input
                          className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 outline-none"
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

                    <label className="block text-sm font-medium text-slate-700">
                      Venue
                      <input
                        className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 outline-none"
                        value={mintForm.venue}
                        onChange={(event) =>
                          setMintForm((current) => ({ ...current, venue: event.target.value }))
                        }
                      />
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Event date
                        <input
                          className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 outline-none"
                          value={mintForm.date}
                          onChange={(event) =>
                            setMintForm((current) => ({ ...current, date: event.target.value }))
                          }
                        />
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Region
                        <input
                          className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 outline-none"
                          value={mintForm.region}
                          onChange={(event) =>
                            setMintForm((current) => ({ ...current, region: event.target.value }))
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <button
                    className="mt-5 w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    onClick={handleMint}
                  >
                    Issue ticket into demo ledger
                  </button>
                </article>

                <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-lg font-semibold text-slate-900">Check in ticket</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    核销后票券会立即从可转让状态切换为锁定状态，前台和后台都会同步显示。
                  </p>

                  <label className="mt-5 block text-sm font-medium text-slate-700">
                    Ticket ID
                    <input
                      className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 outline-none"
                      type="number"
                      min="1"
                      step="1"
                      value={usedTicketId}
                      onChange={(event) => setUsedTicketId(event.target.value)}
                      placeholder="101"
                    />
                  </label>

                  <button
                    className="mt-5 w-full rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    onClick={handleCheckIn}
                  >
                    Mark ticket as used
                  </button>

                  <div className="mt-6 rounded-[20px] border border-slate-200 bg-white p-4 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">Current operation state</p>
                    <p className="mt-2">
                      {latestActivity ? latestActivity.detail : "Waiting for the next operation."}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                      {latestActivity ? formatLedgerTime(latestActivity.createdAt) : "Idle"}
                    </p>
                  </div>
                </article>
              </div>

              {feedback ? (
                <div className="mt-5 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {feedback}
                </div>
              ) : null}
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Ticket Inventory</p>
                  <h2 className="mt-2 text-2xl font-semibold">Operational ticket state</h2>
                </div>
                <p className="text-sm text-slate-500">{ledger.tickets.length} tickets tracked</p>
              </div>

              <div className="mt-6 space-y-3">
                {ledger.tickets.map((ticket) => (
                  <article
                    key={ticket.id}
                    className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">#{ticket.id}</span>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(ticket.listed, ticket.used)}`}
                          >
                            {ticket.used ? "Checked in" : ticket.listed ? "Listed" : "Held"}
                          </span>
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-slate-900">{ticket.event}</h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {ticket.artist} · {ticket.venue} · Seat {ticket.seat}
                        </p>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-600 md:text-right">
                        <p>Owner: <span className="font-semibold text-slate-900">{getAccountName(ledger, ticket.ownerAccountId)}</span></p>
                        <p>Current: <span className="font-semibold text-slate-900">{formatTokenAmount(ticket.currentPrice)}</span></p>
                        <p>Cap: <span className="font-semibold text-slate-900">{formatTokenAmount(getTicketCap(ticket))}</span></p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Accounts</p>
              <h2 className="mt-2 text-2xl font-semibold">Virtual balance board</h2>

              <div className="mt-6 space-y-3">
                {ledger.accounts.map((account) => (
                  <article
                    key={account.id}
                    className="rounded-[20px] border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{account.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{account.role}</p>
                      </div>
                      <p className="text-lg font-semibold text-slate-900">
                        {formatTokenAmount(account.balance)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Ledger Feed</p>
                  <h2 className="mt-2 text-2xl font-semibold">Recent backend records</h2>
                </div>
                <p className="text-sm text-slate-500">{ledger.activity.length} entries</p>
              </div>

              <div className="mt-6 space-y-3">
                {ledger.activity.slice(0, 8).map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[20px] border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-slate-500">
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
