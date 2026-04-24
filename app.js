import {
  WEEKDAY_LABELS,
  createCompletedOrderEvent,
  createOrderRecord,
  createScrapEvent,
  createSeedState,
  formatDateTime,
  formatHours,
  formatKg,
  formatNumber,
  formatWindowLabel,
  normalizeConfig,
  normalizeState,
  recalculatePlan,
  toDateTimeInputValue,
} from "./planner.js";

const STORAGE_KEY = "himasa-production-planner:v1";

const VIEW_META = {
  overview: {
    eyebrow: "Painel",
    title: "Visao geral da operacao",
    description:
      "Resumo semanal da producao, indicadores principais e leitura rapida da sequencia.",
  },
  planning: {
    eyebrow: "Fila",
    title: "Planejamento operacional",
    description:
      "Tela dedicada ao cadastro de ordens, ajuste de fila e reordenacao operacional.",
  },
  "completed-history": {
    eyebrow: "Expedicao",
    title: "Historico de pedidos prontos",
    description:
      "Pedidos finalizados saem da fila ativa e ficam registrados aqui com o horario da conclusao.",
  },
  scrap: {
    eyebrow: "Qualidade",
    title: "Controle de refugos",
    description:
      "Lance refugos por ordem, acompanhe impacto no plano e consulte o historico.",
  },
  settings: {
    eyebrow: "Parametros",
    title: "Configuracoes do sistema",
    description:
      "Ajuste calendario produtivo, produtividade padrao e utilitarios de exportacao.",
  },
};

const PLANNING_VIEW_META = {
  queue: {
    eyebrow: "Fila",
    title: "Planejamento operacional",
    description:
      "Tela dedicada a organizar a fila, editar ordens existentes e controlar a sequencia.",
  },
  create: {
    eyebrow: "Cadastro",
    title: "Cadastro de nova ordem",
    description:
      "Tela isolada para inserir novas ordens sem competir visualmente com a tabela da fila.",
  },
};

const SCRAP_VIEW_META = {
  launch: {
    eyebrow: "Qualidade",
    title: "Lancamento de refugo",
    description:
      "Tela isolada para selecionar ordens, registrar refugos e recalcular a fila sem distracoes.",
  },
  history: {
    eyebrow: "Rastreabilidade",
    title: "Historico de refugos",
    description:
      "Tela dedicada a auditar lancamentos, revisar observacoes e remover registros incorretos.",
  },
};

const state = {
  ...loadState(),
  currentView: getViewFromHash(),
  currentPlanningView: "queue",
  currentScrapView: "launch",
};

const elements = {
  viewNav: document.querySelector("#view-nav"),
  viewButtons: [...document.querySelectorAll("[data-view]")],
  planningNav: document.querySelector("#planning-nav"),
  planningViewButtons: [...document.querySelectorAll("[data-planning-view]")],
  planningScreens: [...document.querySelectorAll("[data-planning-screen]")],
  scrapNav: document.querySelector("#scrap-nav"),
  scrapViewButtons: [...document.querySelectorAll("[data-scrap-view]")],
  scrapScreens: [...document.querySelectorAll("[data-scrap-screen]")],
  screens: [...document.querySelectorAll(".screen")],
  screenEyebrow: document.querySelector("#screen-eyebrow"),
  screenTitle: document.querySelector("#screen-title"),
  screenDescription: document.querySelector("#screen-description"),
  settingsForm: document.querySelector("#settings-form"),
  orderForm: document.querySelector("#order-form"),
  ordersBody: document.querySelector("#orders-body"),
  overviewOrders: document.querySelector("#overview-orders"),
  scrapOrders: document.querySelector("#scrap-orders"),
  scrapHistory: document.querySelector("#scrap-history"),
  completedHistory: document.querySelector("#completed-history-list"),
  completedHistoryHint: document.querySelector("#completed-history-hint"),
  scrapDialog: document.querySelector("#scrap-dialog"),
  scrapForm: document.querySelector("#scrap-form"),
  scrapCancel: document.querySelector("#scrap-cancel"),
  scrapDialogTitle: document.querySelector("#scrap-dialog-title"),
  scrapOrderId: document.querySelector("#scrap-order-id"),
  scrapKg: document.querySelector("#scrap-kg"),
  scrapOccurredAt: document.querySelector("#scrap-occurred-at"),
  scrapNote: document.querySelector("#scrap-note"),
  completedDialog: document.querySelector("#completed-dialog"),
  completedForm: document.querySelector("#completed-form"),
  completedCancel: document.querySelector("#completed-cancel"),
  completedDialogTitle: document.querySelector("#completed-dialog-title"),
  completedDialogSummary: document.querySelector("#completed-dialog-summary"),
  completedOrderId: document.querySelector("#completed-order-id"),
  completedAt: document.querySelector("#completed-at"),
  scheduleWindow: document.querySelector("#schedule-window"),
  lastRecalc: document.querySelector("#last-recalc"),
  metricOrders: document.querySelector("#metric-orders"),
  metricKg: document.querySelector("#metric-kg"),
  metricHours: document.querySelector("#metric-hours"),
  metricEnd: document.querySelector("#metric-end"),
  queueHint: document.querySelector("#queue-hint"),
  historyHint: document.querySelector("#history-hint"),
  toast: document.querySelector("#toast"),
  exportCsv: document.querySelector("#export-csv"),
  printReport: document.querySelector("#print-report"),
  resetData: document.querySelector("#reset-data"),
  printGeneratedAt: document.querySelector("#print-generated-at"),
  printScheduleWindow: document.querySelector("#print-schedule-window"),
  printSummary: document.querySelector("#print-summary"),
  printOrdersBody: document.querySelector("#print-orders-body"),
};

initialize();

function initialize() {
  populateWeekdaySelectors();
  bindEvents();
  syncViewFromHash(true);
  recalculateAndRender();
}

function populateWeekdaySelectors() {
  const dayOptions = WEEKDAY_LABELS.map(
    (label, index) => `<option value="${index}">${label}</option>`,
  ).join("");

  document.querySelector("#week-start-day").innerHTML = dayOptions;
  document.querySelector("#week-end-day").innerHTML = dayOptions;
}

function bindEvents() {
  elements.viewNav.addEventListener("click", handleViewNavigation);
  elements.planningNav.addEventListener("click", handlePlanningNavigation);
  elements.scrapNav.addEventListener("click", handleScrapNavigation);
  window.addEventListener("hashchange", syncViewFromHash);
  document.addEventListener("click", handleActionClick);
  elements.settingsForm.addEventListener("change", handleSettingsChange);
  elements.settingsForm.addEventListener("input", handleSettingsTyping);
  elements.orderForm.addEventListener("submit", handleOrderSubmit);
  elements.ordersBody.addEventListener("change", handleTableEdit);
  elements.scrapForm.addEventListener("submit", handleScrapSubmit);
  elements.scrapCancel.addEventListener("click", () => elements.scrapDialog.close());
  elements.completedForm.addEventListener("submit", handleCompletedSubmit);
  elements.completedCancel.addEventListener("click", () => elements.completedDialog.close());
  elements.exportCsv.addEventListener("click", exportCurrentPlan);
  elements.printReport.addEventListener("click", handlePrintReport);
  elements.resetData.addEventListener("click", restoreInitialSeed);
}

function loadState() {
  const seed = createSeedState();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return seed;
    }

    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch (error) {
    console.error("Falha ao carregar dados locais:", error);
    return seed;
  }
}

function persistState() {
  const payload = {
    config: state.config,
    orders: state.orders,
    scrapEvents: state.scrapEvents,
    completedOrders: state.completedOrders,
    lastRecalculatedAt: state.lastRecalculatedAt,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function recalculateAndRender() {
  state.plan = recalculatePlan(state);
  state.lastRecalculatedAt = new Date().toISOString();
  persistState();
  render();
}

function render() {
  renderChrome();
  renderSettings();
  renderMetrics();
  renderOverviewOrders();
  renderOrders();
  renderScrapOrders();
  renderScrapHistory();
  renderCompletedHistory();
  renderPrintReport();
}

function renderChrome() {
  const config = normalizeConfig(state.config);
  const baseMeta = VIEW_META[state.currentView] || VIEW_META.overview;
  const planningMeta = PLANNING_VIEW_META[state.currentPlanningView];
  const scrapMeta = SCRAP_VIEW_META[state.currentScrapView];
  const meta =
    state.currentView === "planning"
      ? planningMeta || baseMeta
      : state.currentView === "scrap"
        ? scrapMeta || baseMeta
        : baseMeta;

  elements.scheduleWindow.textContent = formatWindowLabel(config);
  elements.lastRecalc.textContent = formatDateTime(state.lastRecalculatedAt);
  elements.screenEyebrow.textContent = meta.eyebrow;
  elements.screenTitle.textContent = meta.title;
  elements.screenDescription.textContent = meta.description;

  elements.viewButtons.forEach((button) => {
    const isActive = button.dataset.view === state.currentView;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });

  elements.screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.dataset.screen === state.currentView);
  });

  renderPlanningSubView();
  renderScrapSubView();
}

function renderSettings() {
  const config = normalizeConfig(state.config);

  document.querySelector("#base-start").value = config.baseStart;
  document.querySelector("#default-rate").value = config.defaultRate;
  document.querySelector("#week-start-day").value = String(config.weekStartDay);
  document.querySelector("#week-start-time").value = config.weekStartTime;
  document.querySelector("#week-end-day").value = String(config.weekEndDay);
  document.querySelector("#week-end-time").value = config.weekEndTime;
}

function renderMetrics() {
  const totalOrders = state.plan.length;
  const totalKg = state.plan.reduce((sum, order) => sum + order.totalKg, 0);
  const totalHours = state.plan.reduce((sum, order) => sum + order.hours, 0);
  const lastOrder = state.plan.at(-1);
  const totalScrap = state.scrapEvents.reduce((sum, event) => sum + event.kg, 0);

  elements.metricOrders.textContent = String(totalOrders);
  elements.metricKg.textContent = formatKg(totalKg);
  elements.metricHours.textContent = formatHours(totalHours);
  elements.metricEnd.textContent = lastOrder
    ? formatDateTime(lastOrder.endAt)
    : "--";

  elements.queueHint.textContent = lastOrder
    ? `Fila recalculada ate ${formatDateTime(lastOrder.endAt)}.`
    : "Nenhuma ordem cadastrada para a fila atual.";

  elements.historyHint.textContent = `${formatKg(totalScrap)} de refugo acumulado em ${state.scrapEvents.length} lancamento(s).`;
}

function renderOverviewOrders() {
  if (!state.plan.length) {
    elements.overviewOrders.innerHTML = `
      <article class="empty-card">
        Nenhuma ordem cadastrada. Use a tela de planejamento para montar a fila.
      </article>
    `;
    return;
  }

  elements.overviewOrders.innerHTML = state.plan.slice(0, 6).map((order) => `
    <article class="order-card">
      <div class="order-card__top">
        <span class="sequence-chip">${order.sequence}</span>
        <div>
          <strong>Ordem ${escapeHtml(order.orderNumber)}</strong>
          <p>${escapeHtml(order.client)}</p>
        </div>
      </div>

      <div class="order-card__stats">
        <span>${formatKg(order.totalKg)} totais</span>
        <span>${formatHours(order.hours)}</span>
      </div>

      <p class="order-card__time">
        ${formatDateTime(order.startAt)} ate ${formatDateTime(order.endAt)}
      </p>

      <button type="button" data-action="scrap" data-order-id="${order.id}">
        Registrar refugo
      </button>
    </article>
  `).join("");
}

function renderOrders() {
  if (!state.plan.length) {
    elements.ordersBody.innerHTML = `
      <article class="empty-card">
        Cadastre a primeira ordem para iniciar o planejamento.
      </article>
    `;
    return;
  }

  elements.ordersBody.innerHTML = state.plan.map((order, index) => `
    <article class="queue-card" data-order-id="${order.id}">
      <div class="queue-card__header">
        <div class="queue-card__identity">
          <div class="queue-sequence">
            <span class="queue-label">Seq.</span>
            <span class="sequence-chip">${order.sequence}</span>
          </div>

          <label class="queue-field queue-field--order">
            <span class="queue-label">Ordem</span>
            <input class="queue-input" data-field="orderNumber" value="${escapeHtml(order.orderNumber)}" />
          </label>

          <label class="queue-field queue-field--client">
            <span class="queue-label">Cliente</span>
            <input class="queue-input" data-field="client" value="${escapeHtml(order.client)}" />
          </label>
        </div>

        <div class="action-stack queue-card__actions">
          <button type="button" data-action="complete" data-order-id="${order.id}">Pedido pronto</button>
          <button type="button" data-action="scrap" data-order-id="${order.id}">Refugo</button>
          <button type="button" data-action="up" data-order-id="${order.id}" ${index === 0 ? "disabled" : ""}>Subir</button>
          <button type="button" data-action="down" data-order-id="${order.id}" ${index === state.plan.length - 1 ? "disabled" : ""}>Descer</button>
          <button type="button" class="ghost" data-action="delete" data-order-id="${order.id}">Excluir</button>
        </div>
      </div>

      <div class="queue-card__body">
        <label class="queue-metric queue-metric--editable">
          <span class="queue-label">KG planejado</span>
          <input class="queue-input" data-field="plannedKg" type="number" min="0.01" step="0.01" value="${order.plannedKg}" />
        </label>

        <label class="queue-metric queue-metric--editable">
          <span class="queue-label">KG por hora</span>
          <input class="queue-input" data-field="rateKgPerHour" type="number" min="0.01" step="0.01" value="${order.rateKgPerHour}" />
        </label>

        <div class="queue-metric">
          <span class="queue-label">Refugo</span>
          <strong class="readonly-pill">${formatKg(order.scrapKg)}</strong>
        </div>

        <div class="queue-metric">
          <span class="queue-label">Horas</span>
          <strong class="readonly-pill readonly-pill--soft">${formatHours(order.hours)}</strong>
        </div>
      </div>

      <div class="queue-card__timeline">
        <div class="queue-timebox">
          <span class="queue-label">Inicio</span>
          <strong>${formatDateTime(order.startAt)}</strong>
        </div>

        <div class="queue-timebox">
          <span class="queue-label">Termino</span>
          <strong>${formatDateTime(order.endAt)}</strong>
        </div>
      </div>
    </article>
  `).join("");
}

function renderScrapOrders() {
  if (!state.plan.length) {
    elements.scrapOrders.innerHTML = `
      <article class="empty-card">
        Nenhuma ordem na fila. Cadastre ordens antes de registrar refugos.
      </article>
    `;
    return;
  }

  elements.scrapOrders.innerHTML = state.plan.map((order) => `
    <article class="scrap-card">
      <div class="scrap-card__head">
        <div>
          <span class="scrap-card__sequence">Seq. ${order.sequence}</span>
          <strong>Ordem ${escapeHtml(order.orderNumber)}</strong>
          <p>${escapeHtml(order.client)}</p>
        </div>
        <span class="readonly-pill">${formatKg(order.scrapKg)}</span>
      </div>

      <div class="scrap-card__body">
        <span>Planejado: ${formatKg(order.plannedKg)}</span>
        <span>Total atual: ${formatKg(order.totalKg)}</span>
        <span>Termino: ${formatDateTime(order.endAt)}</span>
      </div>

      <button type="button" data-action="scrap" data-order-id="${order.id}">
        Lancar refugo nesta ordem
      </button>
    </article>
  `).join("");
}

function renderScrapHistory() {
  if (!state.scrapEvents.length) {
    elements.scrapHistory.innerHTML = `
      <li class="empty-history">
        Nenhum refugo registrado. Os lancamentos aparecerao aqui para auditoria.
      </li>
    `;
    return;
  }

  const orderLookup = new Map(state.plan.map((order) => [order.id, order]));
  state.completedOrders.forEach((order) => {
    if (!orderLookup.has(order.orderId)) {
      orderLookup.set(order.orderId, order);
    }
  });
  const items = [...state.scrapEvents].sort(
    (a, b) => new Date(b.occurredAt) - new Date(a.occurredAt),
  );

  elements.scrapHistory.innerHTML = items.map((event) => {
    const order = orderLookup.get(event.orderId);
    const label = order
      ? `Ordem ${escapeHtml(order.orderNumber)} - ${escapeHtml(order.client)}`
      : "Ordem removida";

    return `
      <li class="history-item">
        <div>
          <strong>${label}</strong>
          <p class="history-meta">${formatKg(event.kg)} em ${formatDateTime(event.occurredAt)}</p>
          <p class="history-note">${escapeHtml(event.note || "Sem observacao.")}</p>
        </div>
        <button type="button" class="ghost" data-action="remove-scrap" data-scrap-id="${event.id}">
          Remover
        </button>
      </li>
    `;
  }).join("");
}

function renderCompletedHistory() {
  const totalCompleted = state.completedOrders.length;

  elements.completedHistoryHint.textContent = totalCompleted
    ? `${totalCompleted} pedido(s) finalizado(s) registrado(s) nesta maquina.`
    : "Nenhum pedido pronto registrado ainda.";

  if (!totalCompleted) {
    elements.completedHistory.innerHTML = `
      <li class="empty-history">
        Nenhum pedido foi marcado como pronto. As finalizacoes aparecerao aqui.
      </li>
    `;
    return;
  }

  const items = [...state.completedOrders].sort(
    (a, b) => new Date(b.completedAt) - new Date(a.completedAt),
  );

  elements.completedHistory.innerHTML = items.map((order) => `
    <li class="history-item history-item--completed">
      <div>
        <strong>Ordem ${escapeHtml(order.orderNumber)} - ${escapeHtml(order.client)}</strong>
        <p class="history-meta history-meta--success">
          Finalizado em ${formatDateTime(order.completedAt)}
        </p>
        <p class="history-note">
          Planejado ${formatKg(order.plannedKg)} | Refugo ${formatKg(order.scrapKg)} |
          Total ${formatKg(order.totalKg)} | ${formatHours(order.hours)}
        </p>
        <p class="history-note">
          Janela registrada: ${formatDateTime(order.startAt)} ate ${formatDateTime(order.endAt)}
        </p>
      </div>
      <span class="readonly-pill readonly-pill--success">Pronto</span>
    </li>
  `).join("");
}

function renderPrintReport(printedAt = state.lastRecalculatedAt || new Date().toISOString()) {
  const config = normalizeConfig(state.config);
  const totalKg = state.plan.reduce((sum, order) => sum + order.totalKg, 0);
  const totalHours = state.plan.reduce((sum, order) => sum + order.hours, 0);
  const totalScrap = state.scrapEvents.reduce((sum, event) => sum + event.kg, 0);
  const lastOrder = state.plan.at(-1);

  elements.printGeneratedAt.textContent = `Emitido em ${formatDateTime(printedAt)}`;
  elements.printScheduleWindow.textContent = formatWindowLabel(config);

  elements.printSummary.innerHTML = `
    <article class="print-summary-card">
      <span>Ordens</span>
      <strong>${state.plan.length}</strong>
    </article>
    <article class="print-summary-card">
      <span>KG total</span>
      <strong>${formatKg(totalKg)}</strong>
    </article>
    <article class="print-summary-card">
      <span>Refugo total</span>
      <strong>${formatKg(totalScrap)}</strong>
    </article>
    <article class="print-summary-card">
      <span>Horas totais</span>
      <strong>${formatHours(totalHours)}</strong>
    </article>
    <article class="print-summary-card">
      <span>Fim previsto</span>
      <strong>${lastOrder ? formatDateTime(lastOrder.endAt) : "--"}</strong>
    </article>
  `;

  if (!state.plan.length) {
    elements.printOrdersBody.innerHTML = `
      <tr>
        <td colspan="9" class="print-empty">Nenhuma ordem cadastrada na fila atual.</td>
      </tr>
    `;
    return;
  }

  elements.printOrdersBody.innerHTML = state.plan.map((order) => `
    <tr>
      <td>${order.sequence}</td>
      <td>${escapeHtml(order.orderNumber)}</td>
      <td>${escapeHtml(order.client)}</td>
      <td>${formatNumber(order.plannedKg, 2)}</td>
      <td>${formatNumber(order.scrapKg, 2)}</td>
      <td>${formatNumber(order.rateKgPerHour, 2)}</td>
      <td>${formatNumber(order.hours, 2)}</td>
      <td>${formatDateTime(order.startAt)}</td>
      <td>${formatDateTime(order.endAt)}</td>
    </tr>
  `).join("");
}

function handleViewNavigation(event) {
  const button = event.target.closest("[data-view]");
  if (!button) {
    return;
  }

  const nextView = normalizeView(button.dataset.view);
  if (window.location.hash !== `#${nextView}`) {
    window.location.hash = nextView;
    return;
  }

  state.currentView = nextView;
  renderChrome();
}

function handlePlanningNavigation(event) {
  const button = event.target.closest("[data-planning-view]");
  if (!button) {
    return;
  }

  state.currentPlanningView = normalizePlanningView(button.dataset.planningView);
  renderChrome();
}

function handleScrapNavigation(event) {
  const button = event.target.closest("[data-scrap-view]");
  if (!button) {
    return;
  }

  state.currentScrapView = normalizeScrapView(button.dataset.scrapView);
  renderChrome();
}

function syncViewFromHash(replaceMissingHash = false) {
  const nextView = getViewFromHash();
  state.currentView = nextView;

  if (replaceMissingHash && window.location.hash !== `#${nextView}`) {
    window.history.replaceState(null, "", `#${nextView}`);
  }

  renderChrome();
}

function renderPlanningSubView() {
  elements.planningViewButtons.forEach((button) => {
    const isActive = button.dataset.planningView === state.currentPlanningView;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });

  elements.planningScreens.forEach((screen) => {
    screen.classList.toggle(
      "is-active",
      screen.dataset.planningScreen === state.currentPlanningView,
    );
  });
}

function renderScrapSubView() {
  elements.scrapViewButtons.forEach((button) => {
    const isActive = button.dataset.scrapView === state.currentScrapView;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });

  elements.scrapScreens.forEach((screen) => {
    screen.classList.toggle(
      "is-active",
      screen.dataset.scrapScreen === state.currentScrapView,
    );
  });
}

function handleSettingsTyping(event) {
  const immediateFields = ["default-rate", "week-start-time", "week-end-time"];
  if (!immediateFields.includes(event.target.id)) {
    return;
  }

  handleSettingsChange();
}

function handleSettingsChange() {
  state.config = {
    baseStart: document.querySelector("#base-start").value,
    defaultRate: document.querySelector("#default-rate").value,
    weekStartDay: document.querySelector("#week-start-day").value,
    weekStartTime: document.querySelector("#week-start-time").value,
    weekEndDay: document.querySelector("#week-end-day").value,
    weekEndTime: document.querySelector("#week-end-time").value,
  };

  recalculateAndRender();
}

function handleOrderSubmit(event) {
  event.preventDefault();

  const formData = new FormData(elements.orderForm);
  const order = createOrderRecord({
    orderNumber: formData.get("orderNumber"),
    client: formData.get("client"),
    plannedKg: formData.get("plannedKg"),
    rateKgPerHour: formData.get("rateKgPerHour") || state.config.defaultRate,
  });

  state.orders.push(order);
  elements.orderForm.reset();
  state.currentPlanningView = "queue";
  recalculateAndRender();
  showToast(`Ordem ${order.orderNumber || "nova"} adicionada a fila.`);
}

function handleTableEdit(event) {
  const target = event.target;
  const row = target.closest("[data-order-id]");
  if (!row) {
    return;
  }

  const order = state.orders.find((item) => item.id === row.dataset.orderId);
  if (!order) {
    return;
  }

  const field = target.dataset.field;
  if (!field) {
    return;
  }

  if (field === "plannedKg" || field === "rateKgPerHour") {
    order[field] = parseDecimal(target.value, order[field]);
  } else {
    order[field] = target.value.trim();
  }

  recalculateAndRender();
}

function handleActionClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const { action, orderId, scrapId } = button.dataset;

  if (action === "remove-scrap") {
    const confirmed = window.confirm("Remover este lancamento de refugo?");
    if (!confirmed) {
      return;
    }

    state.scrapEvents = state.scrapEvents.filter((item) => item.id !== scrapId);
    recalculateAndRender();
    showToast("Lancamento de refugo removido.");
    return;
  }

  const index = state.orders.findIndex((item) => item.id === orderId);
  if (index === -1) {
    return;
  }

  if (action === "complete") {
    openCompletedDialog(state.plan.find((item) => item.id === orderId) || state.orders[index]);
    return;
  }

  if (action === "scrap") {
    openScrapDialog(state.orders[index]);
    return;
  }

  if (action === "up" && index > 0) {
    swapOrders(index, index - 1);
    return;
  }

  if (action === "down" && index < state.orders.length - 1) {
    swapOrders(index, index + 1);
    return;
  }

  if (action === "delete") {
    const order = state.orders[index];
    const confirmed = window.confirm(
      `Excluir a ordem ${order.orderNumber || order.client || "selecionada"}?`,
    );

    if (!confirmed) {
      return;
    }

    state.orders.splice(index, 1);
    state.scrapEvents = state.scrapEvents.filter(
      (item) => item.orderId !== order.id,
    );
    recalculateAndRender();
    showToast("Ordem removida da fila.");
  }
}

function handleScrapSubmit(event) {
  event.preventDefault();

  const orderId = elements.scrapOrderId.value;
  const kg = parseDecimal(elements.scrapKg.value, 0);

  if (!orderId || kg <= 0) {
    showToast("Informe um valor de refugo maior que zero.");
    return;
  }

  const scrapEvent = createScrapEvent({
    orderId,
    kg,
    occurredAt: elements.scrapOccurredAt.value || toDateTimeInputValue(new Date()),
    note: elements.scrapNote.value,
  });

  state.scrapEvents.push(scrapEvent);
  if (state.currentView === "scrap") {
    state.currentScrapView = "history";
  }
  elements.scrapDialog.close();
  elements.scrapForm.reset();
  recalculateAndRender();
  showToast("Refugo registrado e fila recalculada.");
}

function handleCompletedSubmit(event) {
  event.preventDefault();

  const orderId = elements.completedOrderId.value;
  const order = state.plan.find((item) => item.id === orderId);
  const completedAt = elements.completedAt.value || toDateTimeInputValue(new Date());

  if (!orderId || !order) {
    showToast("Nao foi possivel localizar a ordem para finalizar.");
    return;
  }

  const completedOrder = createCompletedOrderEvent({
    orderId: order.id,
    orderNumber: order.orderNumber,
    client: order.client,
    plannedKg: order.plannedKg,
    scrapKg: order.scrapKg,
    totalKg: order.totalKg,
    rateKgPerHour: order.rateKgPerHour,
    hours: order.hours,
    startAt: order.startAt,
    endAt: order.endAt,
    completedAt,
  });

  state.completedOrders.push(completedOrder);
  state.orders = state.orders.filter((item) => item.id !== order.id);
  elements.completedDialog.close();
  elements.completedForm.reset();
  recalculateAndRender();
  navigateToView("completed-history");
  showToast(`Pedido ${order.orderNumber || order.client || "selecionado"} registrado como pronto.`);
}

function handlePrintReport() {
  renderPrintReport(new Date().toISOString());
  window.print();
}

function swapOrders(fromIndex, toIndex) {
  const [moved] = state.orders.splice(fromIndex, 1);
  state.orders.splice(toIndex, 0, moved);
  recalculateAndRender();
}

function openScrapDialog(order) {
  elements.scrapDialogTitle.textContent =
    `Registrar refugo - Ordem ${order.orderNumber || order.client}`;
  elements.scrapOrderId.value = order.id;
  elements.scrapKg.value = "";
  elements.scrapOccurredAt.value = toDateTimeInputValue(new Date());
  elements.scrapNote.value = "";
  elements.scrapDialog.showModal();
}

function openCompletedDialog(order) {
  elements.completedDialogTitle.textContent =
    `Registrar pedido pronto - Ordem ${order.orderNumber || order.client}`;
  elements.completedDialogSummary.textContent =
    `${order.client} | ${formatKg(order.totalKg || order.plannedKg)} totais`;
  elements.completedOrderId.value = order.id;
  elements.completedAt.value = toDateTimeInputValue(new Date());
  elements.completedDialog.showModal();
}

function restoreInitialSeed() {
  const confirmed = window.confirm(
    "Restaurar os dados iniciais do sistema? Os dados locais atuais serao perdidos.",
  );

  if (!confirmed) {
    return;
  }

  const seed = createSeedState();
  state.config = seed.config;
  state.orders = seed.orders;
  state.scrapEvents = seed.scrapEvents;
  state.completedOrders = seed.completedOrders;
  recalculateAndRender();
  showToast("Base inicial restaurada.");
}

function exportCurrentPlan() {
  const headers = [
    "Sequencia",
    "Ordem",
    "Cliente",
    "KG Planejado",
    "Refugo KG",
    "KG Total",
    "Produtividade KG/H",
    "Horas",
    "Inicio",
    "Termino",
  ];

  const rows = state.plan.map((order) => [
    order.sequence,
    safeCsvField(order.orderNumber),
    safeCsvField(order.client),
    formatNumber(order.plannedKg, 2),
    formatNumber(order.scrapKg, 2),
    formatNumber(order.totalKg, 2),
    formatNumber(order.rateKgPerHour, 2),
    formatNumber(order.hours, 2),
    formatDateTime(order.startAt),
    formatDateTime(order.endAt),
  ]);

  const csvContent = [
    headers.join(";"),
    ...rows.map((row) => row.join(";")),
  ].join("\r\n");

  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "planejamento_producao.csv";
  link.click();
  URL.revokeObjectURL(url);
  showToast("Relatorio CSV exportado.");
}

function parseDecimal(value, fallback) {
  const normalized = String(value).replace(",", ".");
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function safeCsvField(value) {
  const sanitized = String(value ?? "").replace(/"/g, '""');
  return `"${sanitized}"`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2200);
}

function navigateToView(nextView) {
  const normalizedView = normalizeView(nextView);

  if (window.location.hash !== `#${normalizedView}`) {
    window.location.hash = normalizedView;
    return;
  }

  state.currentView = normalizedView;
  renderChrome();
}

function normalizeView(input) {
  return VIEW_META[input] ? input : "overview";
}

function getViewFromHash() {
  return normalizeView(window.location.hash.replace("#", ""));
}

function normalizePlanningView(input) {
  return PLANNING_VIEW_META[input] ? input : "queue";
}

function normalizeScrapView(input) {
  return SCRAP_VIEW_META[input] ? input : "launch";
}
