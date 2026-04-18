"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { withBasePath } from "@/lib/block-ticket";
import {
  formatLedgerTime,
  formatTokenAmount,
  getAccountName,
  getTicketCap,
  simulateTicketSale,
  subscribeDemoLedger,
  type DemoLedgerState,
  readDemoLedgerState,
} from "@/lib/demo-ledger";

export function BlockTicketDashboard() {
  const [ledger, setLedger] = useState<DemoLedgerState>(() => readDemoLedgerState());
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(() => {
    const initialState = readDemoLedgerState();
    return initialState.tickets[0]?.id ?? null;
  });
  const [buyerAccountId, setBuyerAccountId] = useState("acct-mika");
  const [settlementAmount, setSettlementAmount] = useState("0.72");
  const [panelMessage, setPanelMessage] = useState("");

  useEffect(() => {
    return subscribeDemoLedger((state) => {
      setLedger(state);
    });
  }, []);

  const selectedTicket =
    ledger.tickets.find((ticket) => ticket.id === selectedTicketId) ?? ledger.tickets[0] ?? null;
  const buyerOptions = ledger.accounts.filter(
    (account) => account.id !== selectedTicket?.ownerAccountId,
  );
  const effectiveBuyerAccountId = buyerOptions.some((account) => account.id === buyerAccountId)
    ? buyerAccountId
    : buyerOptions[0]?.id ?? "";
  const selectedBuyer =
    ledger.accounts.find((account) => account.id === effectiveBuyerAccountId) ?? null;
  const capAmount = selectedTicket ? getTicketCap(selectedTicket) : 0;
  const parsedSettlementAmount = Number(settlementAmount || 0);
  const exceedsCap = parsedSettlementAmount > capAmount;
  const listedCount = ledger.tickets.filter((ticket) => ticket.listed && !ticket.used).length;
  const checkedInCount = ledger.tickets.filter((ticket) => ticket.used).length;
  const totalVolume = ledger.activity
    .filter((item) => item.type === "sale")
    .reduce((sum, item) => sum + item.amount, 0);
  const latestActivity = ledger.activity[0];

  const handleSettle = () => {
    if (!selectedTicket || !selectedBuyer) {
      setPanelMessage("请先选择票和买方虚拟账号。");
      return;
    }

    try {
      simulateTicketSale({
        ticketId: selectedTicket.id,
        buyerAccountId: selectedBuyer.id,
        amount: parsedSettlementAmount,
      });
      setPanelMessage("模拟成交已完成，后台账本和前端状态已同步更新。");
    } catch (error) {
      setPanelMessage(error instanceof Error ? error.message : "提交失败。");
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f6fb] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                Simulation Mode
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                Ticket settlement without MetaMask
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                用户可以直接输入成交金额并发起模拟交易。系统会用虚拟账号完成结算、记录后台流水，
                同步刷新票权归属、价格、状态和后台运营视图。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin"
                className="rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Open operations console
              </Link>
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                Price cap active: 110% of original
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <article className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Available tickets</p>
              <p className="mt-3 text-3xl font-semibold">{ledger.tickets.length}</p>
              <p className="mt-2 text-sm text-slate-500">Shared demo inventory</p>
            </article>
            <article className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Active listings</p>
              <p className="mt-3 text-3xl font-semibold">{listedCount}</p>
              <p className="mt-2 text-sm text-slate-500">Ready for settlement</p>
            </article>
            <article className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Checked in</p>
              <p className="mt-3 text-3xl font-semibold">{checkedInCount}</p>
              <p className="mt-2 text-sm text-slate-500">Locked from transfer</p>
            </article>
            <article className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Settled volume</p>
              <p className="mt-3 text-3xl font-semibold">{formatTokenAmount(totalVolume)}</p>
              <p className="mt-2 text-sm text-slate-500">Mock ledger total</p>
            </article>
          </div>
        </header>

        <main className="mt-8 grid flex-1 gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <section className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Marketplace Inventory</p>
                  <h2 className="mt-2 text-2xl font-semibold">Current ticket pool</h2>
                </div>
                <p className="text-sm text-slate-500">Ownership and price update immediately after settlement.</p>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {ledger.tickets.map((ticket) => {
                  const ownerName = getAccountName(ledger, ticket.ownerAccountId);
                  const isSelected = ticket.id === selectedTicket?.id;

                  return (
                    <article
                      key={ticket.id}
                      className={`overflow-hidden rounded-[24px] border transition ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]"
                          : "border-slate-200 bg-white"
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
                              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                                ticket.used
                                  ? "border-stone-300/70 bg-stone-100/80 text-stone-800"
                                  : ticket.listed
                                    ? "border-emerald-300/70 bg-emerald-100/85 text-emerald-800"
                                    : "border-slate-300/70 bg-slate-100/85 text-slate-800"
                              }`}
                            >
                              {ticket.used ? "Checked in" : ticket.listed ? "Listed" : "Held"}
                            </span>
                          </div>
                          <h3 className="mt-3 text-2xl font-semibold">{ticket.artist}</h3>
                          <p className="mt-1 text-sm text-white/85">{ticket.event}</p>
                        </div>
                      </div>

                      <div className={`grid gap-4 p-5 ${isSelected ? "text-slate-200" : "text-slate-600"}`}>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className={`rounded-[18px] border p-4 ${isSelected ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                            <p className="text-xs uppercase tracking-[0.16em] opacity-70">Venue</p>
                            <p className="mt-2 font-semibold">{ticket.venue}</p>
                          </div>
                          <div className={`rounded-[18px] border p-4 ${isSelected ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                            <p className="text-xs uppercase tracking-[0.16em] opacity-70">Seat</p>
                            <p className="mt-2 font-semibold">{ticket.seat}</p>
                          </div>
                        </div>

                        <div className={`rounded-[18px] border p-4 ${isSelected ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                          <div className="flex items-center justify-between text-sm">
                            <span>Owner</span>
                            <span className="font-semibold">{ownerName}</span>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-sm">
                            <span>Original</span>
                            <span className="font-semibold">{formatTokenAmount(ticket.originalPrice)}</span>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-sm">
                            <span>Current</span>
                            <span className="font-semibold">{formatTokenAmount(ticket.currentPrice)}</span>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-sm">
                            <span>Cap</span>
                            <span className="font-semibold">{formatTokenAmount(getTicketCap(ticket))}</span>
                          </div>
                        </div>

                        <button
                          className={`rounded-full px-4 py-3 text-sm font-semibold transition ${
                            isSelected
                              ? "bg-white text-slate-900 hover:bg-slate-100"
                              : "bg-slate-900 text-white hover:bg-slate-800"
                          }`}
                          onClick={() => {
                            setSelectedTicketId(ticket.id);
                            setSettlementAmount(ticket.currentPrice.toFixed(2));
                            setBuyerAccountId(
                              ledger.accounts.find((account) => account.id !== ticket.ownerAccountId)?.id ?? "",
                            );
                            setPanelMessage("");
                          }}
                        >
                          Open settlement panel
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Recent Activity</p>
                  <h2 className="mt-2 text-2xl font-semibold">Backend ledger records</h2>
                </div>
                <p className="text-sm text-slate-500">Latest 6 actions</p>
              </div>

              <div className="mt-6 space-y-3">
                {ledger.activity.slice(0, 6).map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[20px] border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                      </div>
                      <div className="text-sm text-slate-500">
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
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Settlement Panel</p>
              <h2 className="mt-2 text-2xl font-semibold">
                {selectedTicket ? selectedTicket.artist : "No ticket selected"}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {selectedTicket
                  ? `${selectedTicket.event} · ${selectedTicket.venue} · Seat ${selectedTicket.seat}`
                  : "请选择一个票券进行演示。"}
              </p>

              {selectedTicket ? (
                <>
                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Seller</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {getAccountName(ledger, selectedTicket.ownerAccountId)}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Current</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {formatTokenAmount(selectedTicket.currentPrice)}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Cap</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {formatTokenAmount(capAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <label className="block text-sm font-medium text-slate-700">
                      Buyer virtual account
                      <select
                        className="mt-2 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                        value={effectiveBuyerAccountId}
                        onChange={(event) => setBuyerAccountId(event.target.value)}
                        disabled={selectedTicket.used}
                      >
                        {buyerOptions.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name} · Balance {formatTokenAmount(account.balance)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm font-medium text-slate-700">
                      Settlement amount
                      <div className="mt-2 flex items-center rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                        <input
                          className="w-full bg-transparent text-lg font-semibold text-slate-900 outline-none"
                          type="number"
                          min="0"
                          step="0.01"
                          value={settlementAmount}
                          onChange={(event) => setSettlementAmount(event.target.value)}
                          disabled={selectedTicket.used}
                        />
                        <span className="text-sm text-slate-500">ETH</span>
                      </div>
                    </label>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
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
                          ? "border-stone-300 bg-stone-100 text-stone-700"
                          : exceedsCap
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {selectedTicket.used
                        ? "该票已核销，不能再转移。"
                        : exceedsCap
                          ? "当前金额超过原价 110% 上限，系统不会通过。"
                          : "点击后将完成一次虚拟成交，并同步更新后台账本与前端票权状态。"}
                    </div>

                    <button
                      className={`w-full rounded-full px-4 py-3 text-sm font-semibold transition ${
                        selectedTicket.used || exceedsCap
                          ? "cursor-not-allowed bg-slate-200 text-slate-500"
                          : "bg-slate-900 text-white hover:bg-slate-800"
                      }`}
                      onClick={handleSettle}
                      disabled={selectedTicket.used || exceedsCap}
                    >
                      Confirm simulated settlement
                    </button>

                    {panelMessage ? (
                      <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        {panelMessage}
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Virtual Accounts</p>
              <h2 className="mt-2 text-2xl font-semibold">Balance overview</h2>

              <div className="mt-6 space-y-3">
                {ledger.accounts.map((account) => (
                  <article
                    key={account.id}
                    className="rounded-[20px] border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${account.accent}`}>
                          {account.role}
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-900">{account.name}</p>
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
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Latest Sync</p>
              <h2 className="mt-2 text-2xl font-semibold">Delivery-ready demo path</h2>
              <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">
                  {latestActivity ? latestActivity.title : "No records yet"}
                </p>
                <p className="mt-2">{latestActivity?.detail ?? "等待第一条业务记录。"}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                  {latestActivity ? formatLedgerTime(latestActivity.createdAt) : "Not started"}
                </p>
              </div>
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
}
