import test from "node:test";
import assert from "node:assert/strict";

import {
  addWorkingHours,
  createCompletedOrderEvent,
  createOrderRecord,
  formatWindowLabel,
  normalizeState,
  recalculatePlan,
  snapToWorkingTime,
  toDateTimeInputValue,
} from "../planner.js";

const CONFIG = {
  baseStart: "2026-04-15T12:00",
  defaultRate: 750,
  weekStartDay: 0,
  weekStartTime: "22:40",
  weekEndDay: 6,
  weekEndTime: "16:00",
};

test("calcula horas e encadeia ordens em sequencia", () => {
  const orders = [
    createOrderRecord({
      id: "o1",
      orderNumber: "1",
      client: "Cliente A",
      plannedKg: 4000,
      rateKgPerHour: 750,
    }),
    createOrderRecord({
      id: "o2",
      orderNumber: "2",
      client: "Cliente B",
      plannedKg: 6000,
      rateKgPerHour: 750,
    }),
  ];

  const plan = recalculatePlan({ orders, scrapEvents: [], config: CONFIG });

  assert.equal(plan[0].hours, 4000 / 750);
  assert.equal(toDateTimeInputValue(plan[0].startAt), "2026-04-15T12:00");
  assert.equal(toDateTimeInputValue(plan[0].endAt), "2026-04-15T17:20");
  assert.equal(toDateTimeInputValue(plan[1].startAt), "2026-04-15T17:20");
  assert.equal(toDateTimeInputValue(plan[1].endAt), "2026-04-16T01:20");
});

test("empurra a producao para o proximo domingo quando comeca fora da janela", () => {
  const snapped = snapToWorkingTime("2026-04-19T20:00", CONFIG);
  assert.equal(toDateTimeInputValue(snapped), "2026-04-19T22:40");
});

test("continua no domingo seguinte quando ultrapassa o fechamento do sabado", () => {
  const end = addWorkingHours("2026-04-18T15:00", 2, CONFIG);
  assert.equal(toDateTimeInputValue(end), "2026-04-19T23:40");
});

test("refugo desloca a ordem atual e as seguintes", () => {
  const orders = [
    createOrderRecord({
      id: "o1",
      orderNumber: "1",
      client: "Cliente A",
      plannedKg: 1500,
      rateKgPerHour: 750,
    }),
    createOrderRecord({
      id: "o2",
      orderNumber: "2",
      client: "Cliente B",
      plannedKg: 750,
      rateKgPerHour: 750,
    }),
  ];

  const baseline = recalculatePlan({ orders, scrapEvents: [], config: CONFIG });
  const withScrap = recalculatePlan({
    orders,
    scrapEvents: [{ id: "s1", orderId: "o1", kg: 750, occurredAt: "2026-04-15T13:00:00.000Z" }],
    config: CONFIG,
  });

  assert.equal(withScrap[0].hours, baseline[0].hours + 1);
  assert.equal(toDateTimeInputValue(withScrap[1].startAt), "2026-04-15T15:00");
  assert.equal(toDateTimeInputValue(baseline[1].startAt), "2026-04-15T14:00");
});

test("descricao da janela reflete configuracao semanal", () => {
  assert.equal(
    formatWindowLabel(CONFIG),
    "Domingo 22:40 ate Sabado 16:00",
  );
});

test("normaliza estado antigo sem pedidos finalizados", () => {
  const state = normalizeState({
    config: CONFIG,
    orders: [],
    scrapEvents: [],
  });

  assert.deepEqual(state.orders, []);
  assert.deepEqual(state.completedOrders, []);
});

test("cria snapshot de pedido finalizado com totais coerentes", () => {
  const completed = createCompletedOrderEvent({
    orderId: "o1",
    orderNumber: "123",
    client: "Cliente A",
    plannedKg: 1000,
    scrapKg: 50,
    completedAt: "2026-04-22T09:30",
  });

  assert.equal(completed.orderId, "o1");
  assert.equal(completed.totalKg, 1050);
  assert.equal(completed.completedAt, "2026-04-22T09:30");
});
