const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MS_PER_WEEK = 7 * MS_PER_DAY;
const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

export const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terca",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sabado",
];

export const DEFAULT_CONFIG = Object.freeze({
  baseStart: "2026-04-15T12:00",
  defaultRate: 750,
  weekStartDay: 0,
  weekStartTime: "22:40",
  weekEndDay: 6,
  weekEndTime: "16:00",
});

const SEED_ORDERS = [
  createOrderRecord({
    id: "seed-1",
    orderNumber: "1",
    client: "Kambe",
    plannedKg: 4000,
    rateKgPerHour: 750,
  }),
  createOrderRecord({
    id: "seed-2",
    orderNumber: "2",
    client: "Costa Diniz",
    plannedKg: 6000,
    rateKgPerHour: 750,
  }),
  createOrderRecord({
    id: "seed-3",
    orderNumber: "3",
    client: "Margarida",
    plannedKg: 2100,
    rateKgPerHour: 750,
  }),
  createOrderRecord({
    id: "seed-4",
    orderNumber: "4",
    client: "Casa Sol",
    plannedKg: 31000,
    rateKgPerHour: 750,
  }),
  createOrderRecord({
    id: "seed-5",
    orderNumber: "5",
    client: "Embalatrento +",
    plannedKg: 75000,
    rateKgPerHour: 750,
  }),
];

export function createSeedState() {
  return {
    config: { ...DEFAULT_CONFIG },
    orders: SEED_ORDERS.map((order) => ({ ...order })),
    scrapEvents: [],
    completedOrders: [],
    lastRecalculatedAt: null,
  };
}

export function createOrderRecord(partial = {}) {
  return {
    id: partial.id || makeId("ord"),
    orderNumber: String(partial.orderNumber || ""),
    client: String(partial.client || ""),
    plannedKg: coerceNumber(partial.plannedKg, 0),
    rateKgPerHour: coerceNumber(partial.rateKgPerHour, DEFAULT_CONFIG.defaultRate),
    status: "planejado",
  };
}

export function createScrapEvent(partial = {}) {
  return {
    id: partial.id || makeId("scrap"),
    orderId: String(partial.orderId || ""),
    kg: coerceNumber(partial.kg, 0),
    occurredAt: partial.occurredAt || new Date().toISOString(),
    note: String(partial.note || "").trim(),
  };
}

export function createCompletedOrderEvent(partial = {}) {
  const plannedKg = coerceNumber(partial.plannedKg, 0);
  const scrapKg = coerceNumber(partial.scrapKg, 0);
  const totalKg = coerceNumber(partial.totalKg, plannedKg + scrapKg);

  return {
    id: partial.id || makeId("done"),
    orderId: String(partial.orderId || ""),
    orderNumber: String(partial.orderNumber || ""),
    client: String(partial.client || ""),
    plannedKg,
    scrapKg,
    totalKg,
    rateKgPerHour: coerceNumber(
      partial.rateKgPerHour,
      DEFAULT_CONFIG.defaultRate,
    ),
    hours: coerceNumber(partial.hours, 0),
    startAt: partial.startAt || null,
    endAt: partial.endAt || null,
    completedAt: partial.completedAt || new Date().toISOString(),
  };
}

export function normalizeState(input) {
  const seed = createSeedState();
  const config = normalizeConfig(input?.config || seed.config);

  const orders = Array.isArray(input?.orders)
    ? input.orders.map((order) => createOrderRecord(order))
    : seed.orders;

  const scrapEvents = Array.isArray(input?.scrapEvents)
    ? input.scrapEvents
        .filter((event) => event && event.orderId)
        .map((event) => createScrapEvent(event))
    : [];

  const completedOrders = Array.isArray(input?.completedOrders)
    ? input.completedOrders
        .filter((event) => event && event.orderId)
        .map((event) => createCompletedOrderEvent(event))
    : [];

  return {
    config,
    orders,
    scrapEvents,
    completedOrders,
    lastRecalculatedAt: input?.lastRecalculatedAt || null,
  };
}

export function normalizeConfig(input = {}) {
  return {
    baseStart: normalizeDateTimeLocal(input.baseStart, DEFAULT_CONFIG.baseStart),
    defaultRate: positiveOrFallback(
      input.defaultRate,
      DEFAULT_CONFIG.defaultRate,
    ),
    weekStartDay: coerceDay(input.weekStartDay, DEFAULT_CONFIG.weekStartDay),
    weekStartTime: normalizeTimeString(
      input.weekStartTime,
      DEFAULT_CONFIG.weekStartTime,
    ),
    weekEndDay: coerceDay(input.weekEndDay, DEFAULT_CONFIG.weekEndDay),
    weekEndTime: normalizeTimeString(
      input.weekEndTime,
      DEFAULT_CONFIG.weekEndTime,
    ),
  };
}

export function parseLocalDateTime(value) {
  if (!value) {
    return new Date(DEFAULT_CONFIG.baseStart);
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return new Date(DEFAULT_CONFIG.baseStart);
}

export function toDateTimeInputValue(input) {
  const date = ensureDate(input);
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function formatDateTime(input, locale = "pt-BR") {
  if (!input) {
    return "--";
  }

  const date = ensureDate(input);
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatHours(value) {
  return `${formatNumber(value, 2)} h`;
}

export function formatKg(value) {
  return `${formatNumber(value, 2)} kg`;
}

export function formatWindowLabel(config) {
  const normalized = normalizeConfig(config);
  return `${WEEKDAY_LABELS[normalized.weekStartDay]} ${normalized.weekStartTime} ate ${WEEKDAY_LABELS[normalized.weekEndDay]} ${normalized.weekEndTime}`;
}

export function formatNumber(value, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(Number(value) || 0);
}

export function groupScrapByOrder(scrapEvents = []) {
  return scrapEvents.reduce((map, event) => {
    const current = map.get(event.orderId) || 0;
    map.set(event.orderId, current + coerceNumber(event.kg, 0));
    return map;
  }, new Map());
}

export function recalculatePlan({ orders = [], scrapEvents = [], config = DEFAULT_CONFIG }) {
  const normalizedConfig = normalizeConfig(config);
  const scrapByOrder = groupScrapByOrder(scrapEvents);

  let cursor = snapToWorkingTime(
    parseLocalDateTime(normalizedConfig.baseStart),
    normalizedConfig,
  );

  return orders.map((order, index) => {
    const plannedKg = coerceNumber(order.plannedKg, 0);
    const rateKgPerHour = positiveOrFallback(
      order.rateKgPerHour,
      normalizedConfig.defaultRate,
    );
    const scrapKg = scrapByOrder.get(order.id) || 0;
    const totalKg = plannedKg + scrapKg;
    const hours = rateKgPerHour > 0 ? totalKg / rateKgPerHour : 0;
    const startAt = new Date(cursor);
    const endAt = addWorkingHours(startAt, hours, normalizedConfig);

    cursor = new Date(endAt);

    return {
      ...order,
      sequence: index + 1,
      plannedKg,
      rateKgPerHour,
      scrapKg,
      totalKg,
      hours,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    };
  });
}

export function snapToWorkingTime(input, config = DEFAULT_CONFIG) {
  const normalizedConfig = normalizeConfig(config);
  const date = ensureDate(input);
  const opening = getWeekOpeningBeforeOrAt(date, normalizedConfig);
  const closing = getWindowClose(opening, normalizedConfig);

  if (date >= opening && date < closing) {
    return date;
  }

  return new Date(opening.getTime() + MS_PER_WEEK);
}

export function addWorkingHours(start, hours, config = DEFAULT_CONFIG) {
  const normalizedConfig = normalizeConfig(config);
  let current = snapToWorkingTime(start, normalizedConfig);
  let remainingMs = Math.max(0, Number(hours) || 0) * MS_PER_HOUR;

  if (remainingMs === 0) {
    return current;
  }

  while (remainingMs > 1) {
    const opening = getWeekOpeningBeforeOrAt(current, normalizedConfig);
    const closing = getWindowClose(opening, normalizedConfig);
    const availableMs = Math.max(0, closing.getTime() - current.getTime());

    if (remainingMs <= availableMs + 1) {
      return new Date(current.getTime() + remainingMs);
    }

    remainingMs -= availableMs;
    current = new Date(opening.getTime() + MS_PER_WEEK);
  }

  return current;
}

export function getWeekOpeningBeforeOrAt(input, config = DEFAULT_CONFIG) {
  const normalizedConfig = normalizeConfig(config);
  const date = ensureDate(input);
  const opening = new Date(date);

  const deltaDays =
    (opening.getDay() - normalizedConfig.weekStartDay + 7) % 7;

  opening.setHours(0, 0, 0, 0);
  opening.setDate(opening.getDate() - deltaDays);

  const [hours, minutes] = parseTimeString(normalizedConfig.weekStartTime);
  opening.setHours(hours, minutes, 0, 0);

  if (opening.getTime() > date.getTime()) {
    opening.setDate(opening.getDate() - 7);
  }

  return opening;
}

export function getWindowClose(opening, config = DEFAULT_CONFIG) {
  const normalizedConfig = normalizeConfig(config);
  return new Date(
    opening.getTime() + getWindowDurationMs(normalizedConfig),
  );
}

export function getWindowDurationMs(config = DEFAULT_CONFIG) {
  const normalizedConfig = normalizeConfig(config);
  const startMinutes = normalizedConfig.weekStartDay * MINUTES_PER_DAY +
    timeToMinutes(normalizedConfig.weekStartTime);
  let endMinutes = normalizedConfig.weekEndDay * MINUTES_PER_DAY +
    timeToMinutes(normalizedConfig.weekEndTime);

  if (endMinutes <= startMinutes) {
    endMinutes += MINUTES_PER_WEEK;
  }

  return (endMinutes - startMinutes) * MS_PER_MINUTE;
}

function positiveOrFallback(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function coerceNumber(value, fallback) {
  if (typeof value === "string") {
    const normalized = value.replace(",", ".");
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function coerceDay(value, fallback) {
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric >= 0 && numeric <= 6) {
    return numeric;
  }
  return fallback;
}

function normalizeTimeString(value, fallback) {
  const time = String(value || fallback);
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());

  if (!match) {
    return fallback;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return fallback;
  }

  return `${pad(hours)}:${pad(minutes)}`;
}

function normalizeDateTimeLocal(value, fallback) {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return toDateTimeInputValue(parsed);
  }
  return fallback;
}

function parseTimeString(value) {
  const [hours, minutes] = normalizeTimeString(value, "00:00")
    .split(":")
    .map((part) => Number(part));
  return [hours, minutes];
}

function timeToMinutes(value) {
  const [hours, minutes] = parseTimeString(value);
  return hours * 60 + minutes;
}

function ensureDate(input) {
  const date = input instanceof Date ? new Date(input) : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return new Date(DEFAULT_CONFIG.baseStart);
  }
  return date;
}

function makeId(prefix) {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function pad(value) {
  return String(value).padStart(2, "0");
}
