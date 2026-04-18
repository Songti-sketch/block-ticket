"use client";

export type DemoAccount = {
  id: string;
  name: string;
  role: string;
  balance: number;
  accent: string;
};

export type DemoTicket = {
  id: number;
  artist: string;
  event: string;
  seat: string;
  ownerAccountId: string;
  originalPrice: number;
  currentPrice: number;
  venue: string;
  date: string;
  listed: boolean;
  used: boolean;
  region: string;
  imageSrc?: string;
  accent: string;
};

export type DemoLedgerEntry = {
  id: string;
  type: "mint" | "sale" | "check_in";
  title: string;
  detail: string;
  ticketId: number;
  amount: number;
  actorAccountId: string;
  counterpartyAccountId?: string;
  createdAt: string;
};

export type DemoLedgerState = {
  accounts: DemoAccount[];
  tickets: DemoTicket[];
  activity: DemoLedgerEntry[];
};

export type MintTicketInput = {
  ownerAccountId: string;
  artist: string;
  event: string;
  seat: string;
  originalPrice: number;
  venue: string;
  date: string;
  region: string;
  imageSrc?: string;
  accent?: string;
};

export type SimulatedSaleInput = {
  ticketId: number;
  buyerAccountId: string;
  amount: number;
};

const STORAGE_KEY = "block-ticket-demo-ledger";
const EVENT_NAME = "block-ticket-demo-ledger-updated";

const initialState: DemoLedgerState = {
  accounts: [
    {
      id: "acct-organizer",
      name: "Organizer Treasury",
      role: "Organizer",
      balance: 42.5,
      accent: "text-sky-600 bg-sky-50 border-sky-200",
    },
    {
      id: "acct-lin",
      name: "Lin Fan Club",
      role: "Primary Buyer",
      balance: 8.6,
      accent: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
    {
      id: "acct-mika",
      name: "Mika Resale Desk",
      role: "Marketplace Buyer",
      balance: 12.4,
      accent: "text-amber-700 bg-amber-50 border-amber-200",
    },
    {
      id: "acct-noah",
      name: "Noah Venue Ops",
      role: "Guest Account",
      balance: 5.2,
      accent: "text-violet-700 bg-violet-50 border-violet-200",
    },
  ],
  tickets: [
    {
      id: 101,
      artist: "五月天 Mayday",
      event: "Just Love It 银河特别场",
      seat: "A-12",
      ownerAccountId: "acct-lin",
      originalPrice: 0.68,
      currentPrice: 0.72,
      venue: "香港启德体育园",
      date: "2025-05-18 20:00",
      listed: true,
      used: false,
      region: "Greater China",
      imageSrc: "/artists/may.jpeg",
      accent: "from-sky-500 to-cyan-500",
    },
    {
      id: 102,
      artist: "陈奕迅 Eason Chan",
      event: "Fear and Dreams Final Encore",
      seat: "VIP-03",
      ownerAccountId: "acct-mika",
      originalPrice: 0.92,
      currentPrice: 0.97,
      venue: "澳门银河综艺馆",
      date: "2025-06-07 19:30",
      listed: true,
      used: false,
      region: "Greater China",
      imageSrc: "/artists/easonChen.jpg",
      accent: "from-rose-500 to-orange-400",
    },
    {
      id: 201,
      artist: "Coldplay",
      event: "Moon Music Stadium Run",
      seat: "B-04",
      ownerAccountId: "acct-noah",
      originalPrice: 1.18,
      currentPrice: 1.18,
      venue: "Tokyo Dome",
      date: "2025-07-02 18:30",
      listed: false,
      used: false,
      region: "International",
      accent: "from-emerald-500 to-teal-500",
    },
  ],
  activity: [
    {
      id: "seed-sale-1",
      type: "sale",
      title: "Resale settled",
      detail: "Ticket #102 transferred from Mika Resale Desk to Noah Venue Ops.",
      ticketId: 102,
      amount: 0.97,
      actorAccountId: "acct-mika",
      counterpartyAccountId: "acct-noah",
      createdAt: "2025-04-12T10:18:00.000Z",
    },
    {
      id: "seed-mint-1",
      type: "mint",
      title: "Ticket issued",
      detail: "Ticket #201 issued from Organizer Treasury to Noah Venue Ops.",
      ticketId: 201,
      amount: 1.18,
      actorAccountId: "acct-organizer",
      counterpartyAccountId: "acct-noah",
      createdAt: "2025-04-11T08:05:00.000Z",
    },
  ],
};

function cloneState(state: DemoLedgerState) {
  return JSON.parse(JSON.stringify(state)) as DemoLedgerState;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function dispatchLedgerEvent() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

function persistState(state: DemoLedgerState) {
  if (!isBrowser()) {
    return state;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  dispatchLedgerEvent();
  return state;
}

export function getInitialDemoLedgerState() {
  return cloneState(initialState);
}

export function readDemoLedgerState() {
  if (!isBrowser()) {
    return getInitialDemoLedgerState();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return persistState(getInitialDemoLedgerState());
  }

  try {
    return JSON.parse(raw) as DemoLedgerState;
  } catch {
    return persistState(getInitialDemoLedgerState());
  }
}

export function subscribeDemoLedger(listener: (state: DemoLedgerState) => void) {
  if (!isBrowser()) {
    return () => undefined;
  }

  const handleChange = () => {
    listener(readDemoLedgerState());
  };

  window.addEventListener(EVENT_NAME, handleChange);
  window.addEventListener("storage", handleChange);

  return () => {
    window.removeEventListener(EVENT_NAME, handleChange);
    window.removeEventListener("storage", handleChange);
  };
}

function updateLedgerState(
  updater: (state: DemoLedgerState) => DemoLedgerState,
) {
  const nextState = updater(cloneState(readDemoLedgerState()));
  return persistState(nextState);
}

function getAccountById(state: DemoLedgerState, accountId: string) {
  return state.accounts.find((account) => account.id === accountId);
}

function getTicketById(state: DemoLedgerState, ticketId: number) {
  return state.tickets.find((ticket) => ticket.id === ticketId);
}

export function formatTokenAmount(value: number) {
  return `${value.toFixed(2)} ETH`;
}

export function formatLedgerTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getTicketCap(ticket: DemoTicket) {
  return Number((ticket.originalPrice * 1.1).toFixed(2));
}

export function getAccountName(state: DemoLedgerState, accountId: string) {
  return getAccountById(state, accountId)?.name ?? "Unknown Account";
}

export function resetDemoLedgerState() {
  return persistState(getInitialDemoLedgerState());
}

export function mintDemoTicket(input: MintTicketInput) {
  if (!input.ownerAccountId || !input.artist || !input.event || !input.seat) {
    throw new Error("Please complete the required ticket fields.");
  }

  if (!Number.isFinite(input.originalPrice) || input.originalPrice <= 0) {
    throw new Error("Original price must be greater than 0.");
  }

  return updateLedgerState((state) => {
    const owner = getAccountById(state, input.ownerAccountId);

    if (!owner) {
      throw new Error("Selected owner account does not exist.");
    }

    const nextId = Math.max(...state.tickets.map((ticket) => ticket.id), 100) + 1;
    const nextTicket: DemoTicket = {
      id: nextId,
      artist: input.artist,
      event: input.event,
      seat: input.seat,
      ownerAccountId: input.ownerAccountId,
      originalPrice: Number(input.originalPrice.toFixed(2)),
      currentPrice: Number(input.originalPrice.toFixed(2)),
      venue: input.venue,
      date: input.date,
      listed: false,
      used: false,
      region: input.region,
      imageSrc: input.imageSrc,
      accent: input.accent ?? "from-slate-700 to-slate-500",
    };

    state.tickets.unshift(nextTicket);
    state.activity.unshift({
      id: `mint-${Date.now()}`,
      type: "mint",
      title: "Ticket issued",
      detail: `Ticket #${nextId} issued from Organizer Treasury to ${owner.name}.`,
      ticketId: nextId,
      amount: nextTicket.originalPrice,
      actorAccountId: "acct-organizer",
      counterpartyAccountId: owner.id,
      createdAt: new Date().toISOString(),
    });

    return state;
  });
}

export function markDemoTicketUsed(ticketId: number) {
  if (!Number.isFinite(ticketId) || ticketId <= 0) {
    throw new Error("Enter a valid ticket ID.");
  }

  return updateLedgerState((state) => {
    const ticket = getTicketById(state, ticketId);

    if (!ticket) {
      throw new Error("Ticket not found.");
    }

    if (ticket.used) {
      throw new Error("This ticket has already been checked in.");
    }

    ticket.used = true;
    ticket.listed = false;

    state.activity.unshift({
      id: `check-in-${Date.now()}`,
      type: "check_in",
      title: "Ticket checked in",
      detail: `Ticket #${ticket.id} was marked as used by venue operations.`,
      ticketId: ticket.id,
      amount: ticket.currentPrice,
      actorAccountId: ticket.ownerAccountId,
      createdAt: new Date().toISOString(),
    });

    return state;
  });
}

export function simulateTicketSale(input: SimulatedSaleInput) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Settlement amount must be greater than 0.");
  }

  return updateLedgerState((state) => {
    const ticket = getTicketById(state, input.ticketId);

    if (!ticket) {
      throw new Error("Ticket not found.");
    }

    if (ticket.used) {
      throw new Error("Checked-in tickets can no longer be transferred.");
    }

    const buyer = getAccountById(state, input.buyerAccountId);
    const seller = getAccountById(state, ticket.ownerAccountId);

    if (!buyer || !seller) {
      throw new Error("Buyer or seller account is missing.");
    }

    if (buyer.id === seller.id) {
      throw new Error("Buyer account must be different from the current owner.");
    }

    const cap = getTicketCap(ticket);
    const amount = Number(input.amount.toFixed(2));

    if (amount > cap) {
      throw new Error(`Settlement amount exceeds the 110% cap (${formatTokenAmount(cap)}).`);
    }

    if (buyer.balance < amount) {
      throw new Error("Buyer account balance is insufficient.");
    }

    buyer.balance = Number((buyer.balance - amount).toFixed(2));
    seller.balance = Number((seller.balance + amount).toFixed(2));
    ticket.ownerAccountId = buyer.id;
    ticket.currentPrice = amount;
    ticket.listed = false;

    state.activity.unshift({
      id: `sale-${Date.now()}`,
      type: "sale",
      title: "Resale settled",
      detail: `Ticket #${ticket.id} transferred from ${seller.name} to ${buyer.name}.`,
      ticketId: ticket.id,
      amount,
      actorAccountId: seller.id,
      counterpartyAccountId: buyer.id,
      createdAt: new Date().toISOString(),
    });

    return state;
  });
}
