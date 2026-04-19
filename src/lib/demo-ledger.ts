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
  version: number;
  ownerAccountId: string;
  originalPrice: number;
  currentPrice: number;
  venue: string;
  date: string;
  listed: boolean;
  used: boolean;
  checkInPendingUntil: string | null;
  region: string;
  imageSrc?: string;
  accent: string;
};

export type DemoLedgerEntry = {
  id: string;
  type:
    | "mint"
    | "sale"
    | "list"
    | "price_update"
    | "cancel_listing"
    | "check_in"
    | "check_in_start"
    | "check_in_release";
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

export type DemoTicketStatus = "listed" | "held" | "check_in_pending" | "used";

const STORAGE_KEY = "block-ticket-demo-ledger";
const EVENT_NAME = "block-ticket-demo-ledger-updated";
const CHECK_IN_LOCK_MINUTES = 3;
const RESALE_CUTOFF_HOURS = 8;

function formatFutureTicketDate(offsetDays: number, hour: number, minute: number) {
  const next = new Date();
  next.setSeconds(0, 0);
  next.setDate(next.getDate() + offsetDays);
  next.setHours(hour, minute, 0, 0);

  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, "0");
  const day = String(next.getDate()).padStart(2, "0");
  const hours = String(next.getHours()).padStart(2, "0");
  const minutes = String(next.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function getFutureTicketDateById(ticketId: number) {
  switch (ticketId) {
    case 101:
      return formatFutureTicketDate(12, 20, 0);
    case 102:
      return formatFutureTicketDate(19, 19, 30);
    case 201:
      return formatFutureTicketDate(27, 18, 30);
    default:
      return formatFutureTicketDate(14, 20, 0);
  }
}

function createInitialDemoLedgerState(): DemoLedgerState {
  return {
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
        artist: "Mayday",
        event: "Just Love It Galaxy Special",
        seat: "A-12",
        version: 1,
        ownerAccountId: "acct-lin",
        originalPrice: 0.68,
        currentPrice: 0.72,
        venue: "Kai Tak Sports Park, Hong Kong",
        date: getFutureTicketDateById(101),
        listed: true,
        used: false,
        checkInPendingUntil: null,
        region: "Greater China",
        imageSrc: "/artists/may.jpeg",
        accent: "from-sky-500 to-cyan-500",
      },
      {
        id: 102,
        artist: "Eason Chan",
        event: "Fear and Dreams Final Encore",
        seat: "VIP-03",
        version: 1,
        ownerAccountId: "acct-mika",
        originalPrice: 0.92,
        currentPrice: 0.97,
        venue: "Galaxy Arena, Macau",
        date: getFutureTicketDateById(102),
        listed: true,
        used: false,
        checkInPendingUntil: null,
        region: "Greater China",
        imageSrc: "/artists/easonChen.jpg",
        accent: "from-rose-500 to-orange-400",
      },
      {
        id: 201,
        artist: "Coldplay",
        event: "Moon Music Stadium Run",
        seat: "B-04",
        version: 1,
        ownerAccountId: "acct-noah",
        originalPrice: 1.18,
        currentPrice: 1.18,
        venue: "Tokyo Dome",
        date: getFutureTicketDateById(201),
        listed: false,
        used: false,
        checkInPendingUntil: null,
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
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
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
        createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      },
    ],
  };
}

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
  return cloneState(createInitialDemoLedgerState());
}

export function readDemoLedgerState() {
  if (!isBrowser()) {
    const initial = getInitialDemoLedgerState();
    normalizeTicketVersions(initial);
    normalizePastTicketDates(initial);
    normalizeExpiredLocks(initial);
    return initial;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return persistState(getInitialDemoLedgerState());
  }

  try {
    const parsed = JSON.parse(raw) as DemoLedgerState;

    const normalizedVersions = normalizeTicketVersions(parsed);
    const normalizedDates = normalizePastTicketDates(parsed);
    const normalizedLocks = normalizeExpiredLocks(parsed);

    if (normalizedVersions || normalizedDates || normalizedLocks) {
      return persistState(parsed);
    }

    return parsed;
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

function getFutureIso(minutes: number) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function parseTicketDate(date: string) {
  const normalized = date.includes("T") ? date : date.replace(" ", "T");
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

export function isTicketCheckInPending(ticket: DemoTicket, now = Date.now()) {
  if (!ticket.checkInPendingUntil || ticket.used) {
    return false;
  }

  return Date.parse(ticket.checkInPendingUntil) > now;
}

export function getTicketStatus(ticket: DemoTicket, now = Date.now()): DemoTicketStatus {
  if (ticket.used) {
    return "used";
  }

  if (isTicketCheckInPending(ticket, now)) {
    return "check_in_pending";
  }

  return ticket.listed ? "listed" : "held";
}

export function isResaleWindowClosed(ticket: DemoTicket, now = Date.now()) {
  const eventTime = parseTicketDate(ticket.date);

  if (eventTime === null) {
    return false;
  }

  return eventTime - now <= RESALE_CUTOFF_HOURS * 60 * 60 * 1000;
}

export function getResaleCutoffHours() {
  return RESALE_CUTOFF_HOURS;
}

export function getCheckInRemainingSeconds(ticket: DemoTicket, now = Date.now()) {
  if (!isTicketCheckInPending(ticket, now) || !ticket.checkInPendingUntil) {
    return 0;
  }

  return Math.max(Math.ceil((Date.parse(ticket.checkInPendingUntil) - now) / 1000), 0);
}

export function formatRemainingSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function normalizeExpiredLocks(state: DemoLedgerState) {
  const now = Date.now();
  let changed = false;

  state.tickets.forEach((ticket) => {
    if (!ticket.checkInPendingUntil || ticket.used) {
      return;
    }

    if (Date.parse(ticket.checkInPendingUntil) <= now) {
      ticket.checkInPendingUntil = null;
      changed = true;

      state.activity.unshift({
        id: `check-in-release-${ticket.id}-${now}`,
        type: "check_in_release",
        title: "Gate lock released",
        detail: `Ticket #${ticket.id} returned to a transferable state after the gate validation window expired.`,
        ticketId: ticket.id,
        amount: ticket.currentPrice,
        actorAccountId: ticket.ownerAccountId,
        createdAt: new Date(now).toISOString(),
      });
    }
  });

  return changed;
}

function normalizePastTicketDates(state: DemoLedgerState) {
  const now = Date.now();
  let changed = false;

  state.tickets.forEach((ticket) => {
    if (ticket.used) {
      return;
    }

    const eventTime = parseTicketDate(ticket.date);

    if (eventTime !== null && eventTime <= now) {
      ticket.date = getFutureTicketDateById(ticket.id);
      changed = true;
    }
  });

  return changed;
}

function normalizeTicketVersions(state: DemoLedgerState) {
  let changed = false;

  state.tickets.forEach((ticket) => {
    if (!Number.isFinite(ticket.version) || ticket.version <= 0) {
      ticket.version = 1;
      changed = true;
    }
  });

  return changed;
}

export function formatTokenAmount(value: number) {
  return `${value.toFixed(2)} ETH`;
}

export function formatLedgerTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
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
      version: 1,
      ownerAccountId: input.ownerAccountId,
      originalPrice: Number(input.originalPrice.toFixed(2)),
      currentPrice: Number(input.originalPrice.toFixed(2)),
      venue: input.venue,
      date: input.date,
      listed: false,
      used: false,
      checkInPendingUntil: null,
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

export function listDemoTicket(ticketId: number) {
  if (!Number.isFinite(ticketId) || ticketId <= 0) {
    throw new Error("Enter a valid ticket ID.");
  }

  return updateLedgerState((state) => {
    const ticket = getTicketById(state, ticketId);

    if (!ticket) {
      throw new Error("Ticket not found.");
    }

    if (ticket.used) {
      throw new Error("Checked-in tickets cannot be listed again.");
    }

    if (isTicketCheckInPending(ticket)) {
      throw new Error("Tickets locked for gate validation cannot be listed.");
    }

    if (isResaleWindowClosed(ticket)) {
      throw new Error(`Resale closes automatically ${RESALE_CUTOFF_HOURS} hours before the event starts.`);
    }

    if (ticket.listed) {
      throw new Error("This ticket is already listed for resale.");
    }

    ticket.listed = true;
    ticket.version += 1;

    state.activity.unshift({
      id: `list-${Date.now()}`,
      type: "list",
      title: "Ticket listed",
      detail: `Ticket #${ticket.id} remains in ${getAccountName(state, ticket.ownerAccountId)} while waiting for a buyer.`,
      ticketId: ticket.id,
      amount: ticket.currentPrice,
      actorAccountId: ticket.ownerAccountId,
      createdAt: new Date().toISOString(),
    });

    return state;
  });
}

export function setDemoTicketListingPrice(ticketId: number, amount: number) {
  if (!Number.isFinite(ticketId) || ticketId <= 0) {
    throw new Error("Enter a valid ticket ID.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Listing price must be greater than 0.");
  }

  return updateLedgerState((state) => {
    const ticket = getTicketById(state, ticketId);

    if (!ticket) {
      throw new Error("Ticket not found.");
    }

    if (ticket.used) {
      throw new Error("Checked-in tickets cannot be repriced.");
    }

    if (isTicketCheckInPending(ticket)) {
      throw new Error("Tickets locked for gate validation cannot be repriced.");
    }

    if (isResaleWindowClosed(ticket)) {
      throw new Error(`Resale closes automatically ${RESALE_CUTOFF_HOURS} hours before the event starts.`);
    }

    const nextAmount = Number(amount.toFixed(2));
    const cap = getTicketCap(ticket);

    if (nextAmount > cap) {
      throw new Error(`Listing price exceeds the 110% cap (${formatTokenAmount(cap)}).`);
    }

    if (ticket.currentPrice === nextAmount) {
      return state;
    }

    ticket.currentPrice = nextAmount;
    ticket.version += 1;

    state.activity.unshift({
      id: `price-update-${Date.now()}`,
      type: "price_update",
      title: "Listing price updated",
      detail: `Ticket #${ticket.id} was repriced to ${formatTokenAmount(nextAmount)} by ${getAccountName(state, ticket.ownerAccountId)}.`,
      ticketId: ticket.id,
      amount: nextAmount,
      actorAccountId: ticket.ownerAccountId,
      createdAt: new Date().toISOString(),
    });

    return state;
  });
}

export function cancelDemoListing(ticketId: number) {
  if (!Number.isFinite(ticketId) || ticketId <= 0) {
    throw new Error("Enter a valid ticket ID.");
  }

  return updateLedgerState((state) => {
    const ticket = getTicketById(state, ticketId);

    if (!ticket) {
      throw new Error("Ticket not found.");
    }

    if (!ticket.listed) {
      throw new Error("This ticket is not currently listed.");
    }

    ticket.listed = false;
    ticket.version += 1;

    state.activity.unshift({
      id: `cancel-listing-${Date.now()}`,
      type: "cancel_listing",
      title: "Listing cancelled",
      detail: `Ticket #${ticket.id} was removed from the market and remains with ${getAccountName(state, ticket.ownerAccountId)}.`,
      ticketId: ticket.id,
      amount: ticket.currentPrice,
      actorAccountId: ticket.ownerAccountId,
      createdAt: new Date().toISOString(),
    });

    return state;
  });
}

export function startDemoCheckIn(ticketId: number) {
  if (!Number.isFinite(ticketId) || ticketId <= 0) {
    throw new Error("Enter a valid ticket ID.");
  }

  return updateLedgerState((state) => {
    const ticket = getTicketById(state, ticketId);

    if (!ticket) {
      throw new Error("Ticket not found.");
    }

    if (ticket.used) {
      throw new Error("Checked-in tickets cannot enter gate validation again.");
    }

    if (isTicketCheckInPending(ticket)) {
      throw new Error("This ticket is already locked for gate validation.");
    }

    ticket.listed = false;
    ticket.checkInPendingUntil = getFutureIso(CHECK_IN_LOCK_MINUTES);
    ticket.version += 1;

    state.activity.unshift({
      id: `check-in-start-${Date.now()}`,
      type: "check_in_start",
      title: "Gate validation started",
      detail: `Ticket #${ticket.id} is locked for gate validation for ${CHECK_IN_LOCK_MINUTES} minutes.`,
      ticketId: ticket.id,
      amount: ticket.currentPrice,
      actorAccountId: ticket.ownerAccountId,
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

    if (!isTicketCheckInPending(ticket)) {
      throw new Error("Start gate validation before marking the ticket as used.");
    }

    ticket.used = true;
    ticket.listed = false;
    ticket.checkInPendingUntil = null;
    ticket.version += 1;

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

    if (isTicketCheckInPending(ticket)) {
      throw new Error("This ticket is locked for gate validation and cannot be transferred.");
    }

    if (!ticket.listed) {
      throw new Error("Only listed tickets can be purchased.");
    }

    if (isResaleWindowClosed(ticket)) {
      throw new Error(`Resale is closed because the event starts within ${RESALE_CUTOFF_HOURS} hours.`);
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
    ticket.checkInPendingUntil = null;
    ticket.version += 1;

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
