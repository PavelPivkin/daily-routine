const activities = [
  ["Футбол", "⚽"], ["Испанский язык", "¡!"], ["Гимнастика", "🤸"],
  ["Барабаны", "🥁"], ["Флейта", "♫"], ["Чтение и литература", "📚"],
  ["Математика", "➗"], ["Лепка", "👐"], ["Рисование", "🎨"],
  ["Столярные работы", "🔨"], ["Сборка электроники", "⚡"],
  ["Поделки из картона", "✂️"], ["Другой проект", "💡"], ["Природоведение", "🌿"],
  ["Зарядка", "☀️"], ["Просмотр мультфильма", "📺"],
  ["Умывание и чистка зубов", "🪥"], ["Уборка", "🧹"], ["Аудиосказка", "🎧"]
].map(([name, icon], index) => ({ id: `a-${index}`, name, icon, type: "activity" }));

const meals = [
  ["Геркулесовая каша", "🥣"], ["Омлет с хлебом и сосиской", "🍳"],
  ["Омлет", "🍳"], ["Кесадилья", "🌮"], ["Блинчики", "🥞"],
  ["Оладушки", "🥞"], ["Банановые панкейки", "🍌"], ["Сырники", "🧀"],
  ["Варёное яйцо и бутерброд", "🥚"], ["Творожная запеканка", "🍰"],
  ["Пюре с рыбной котлетой", "🐟"], ["Пюре с куриной ножкой", "🍗"],
  ["Гречка с куриной котлетой", "🍲"], ["Рис с тунцом", "🍚"],
  ["Суп с фрикадельками", "🥘"], ["Борщ", "🥣"], ["Пицца", "🍕"],
  ["Макароны с куриной подливкой", "🍝"], ["Пельмени", "🥟"],
  ["Винегрет", "🥗"], ["Тунец в кляре", "🐟"],
  ["Свежие овощи", "🥒"], ["Фрукты", "🍎"]
].map(([name, icon], index) => ({ id: `m-${index}`, name, icon, type: "meal" }));

const slotDefinitions = [
  { id: "beforeBreakfast", label: "До завтрака", type: "activity", hint: "Добавить занятие" },
  { id: "breakfast", label: "Завтрак", type: "meal", hint: "Что на завтрак?" },
  { id: "morningActivity", label: "До обеда", type: "activity", hint: "Добавить занятие" },
  { id: "lunch", label: "Обед", type: "meal", hint: "Что на обед?" },
  { id: "afternoonActivity", label: "После обеда", type: "activity", hint: "Добавить занятие" },
  { id: "dinner", label: "Ужин", type: "meal", hint: "Что на ужин?" }
];

const state = {
  weekStart: startOfWeek(new Date()),
  schedule: {},
  activeTab: "activities",
  modalType: "activity",
  modalTarget: null
};

const board = document.querySelector("#week-board");
const library = document.querySelector("#card-library");
const libraryPanel = document.querySelector("#library-panel");
const pickerModal = document.querySelector("#picker-modal");
const modalGrid = document.querySelector("#modal-grid");
const searchInput = document.querySelector("#library-search");
const modalSearch = document.querySelector("#modal-search");
const monthNames = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря"
];

function startOfWeek(date) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  const day = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - day);
  return result;
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function weekKey() {
  return dateKey(state.weekStart);
}

function storageKey() {
  return `family-planner:${weekKey()}`;
}

function sharedPayloadFromUrl() {
  const encoded = new URLSearchParams(location.search).get("plan");
  return encoded ? FamilyShare.decode(encoded) : null;
}

function loadWeek() {
  try {
    state.schedule = JSON.parse(localStorage.getItem(storageKey())) || {};
  } catch {
    state.schedule = {};
  }
}

function applySharedPlan() {
  const shared = sharedPayloadFromUrl();
  if (!shared) return false;
  state.weekStart = startOfWeek(new Date(`${shared.weekStart}T12:00:00`));
  state.schedule = shared.schedule || {};
  localStorage.setItem(storageKey(), JSON.stringify(state.schedule));
  (shared.customCards || []).forEach(card => {
    const list = card.type === "activity" ? activities : meals;
    if (!list.some(item => item.id === card.id)) list.push(card);
  });
  if (shared.customCards?.length) {
    localStorage.setItem("family-planner:custom-cards", JSON.stringify(shared.customCards));
  }
  return true;
}

function loadCustomCards() {
  try {
    const customCards = JSON.parse(localStorage.getItem("family-planner:custom-cards")) || [];
    customCards.forEach(card => {
      const list = card.type === "activity" ? activities : meals;
      if (!list.some(item => item.id === card.id)) list.push(card);
    });
  } catch {
    // Если хранилище повреждено, стандартная коллекция всё равно остаётся доступной.
  }
}

function saveCustomCards() {
  const customCards = [...activities, ...meals].filter(card => String(card.id).startsWith("custom-"));
  localStorage.setItem("family-planner:custom-cards", JSON.stringify(customCards));
}

function sharePayload() {
  return {
    version: 1,
    weekStart: weekKey(),
    schedule: state.schedule,
    customCards: [...activities, ...meals].filter(card => String(card.id).startsWith("custom-"))
  };
}

function shareWeek() {
  const url = FamilyShare.createUrl("index.html", sharePayload());
  FamilyShare.show(url, "Поделиться неделей");
}

function saveWeek() {
  localStorage.setItem(storageKey(), JSON.stringify(state.schedule));
}

function getCards(type) {
  return type === "activity" ? activities : meals;
}

function formatWeekRange() {
  const end = new Date(state.weekStart);
  end.setDate(end.getDate() + 6);
  const startMonth = monthNames[state.weekStart.getMonth()];
  const endMonth = monthNames[end.getMonth()];
  return startMonth === endMonth
    ? `${state.weekStart.getDate()}–${end.getDate()} ${endMonth}`
    : `${state.weekStart.getDate()} ${startMonth} — ${end.getDate()} ${endMonth}`;
}

function renderBoard() {
  document.querySelector("#week-range").textContent = formatWeekRange();
  board.innerHTML = "";
  const today = dateKey(new Date());

  for (let index = 0; index < 7; index += 1) {
    const date = new Date(state.weekStart);
    date.setDate(date.getDate() + index);
    const key = dateKey(date);
    const column = document.createElement("article");
    column.className = "day-column";
    column.innerHTML = `
      <header class="day-header ${key === today ? "today" : ""}" role="button" tabindex="0" aria-label="Открыть ${date.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}">
        <div>
          <div class="day-name">${date.toLocaleDateString("ru-RU", { weekday: "long" })}</div>
          <div class="day-date">${monthNames[date.getMonth()]}</div>
        </div>
        <span class="day-number">${date.getDate()}</span>
      </header>
      <div class="schedule"></div>
    `;
    const dayHeader = column.querySelector(".day-header");
    dayHeader.addEventListener("click", () => openDayView(key));
    dayHeader.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openDayView(key);
      }
    });

    const schedule = column.querySelector(".schedule");
    slotDefinitions.forEach(slot => schedule.append(createSlot(key, slot)));
    board.append(column);
  }
}

function createSlot(dayKey, slot) {
  const wrapper = document.createElement("section");
  wrapper.className = `slot ${slot.type}-slot`;
  wrapper.innerHTML = `
    <div class="slot-label">
      <span>${slot.label}</span>
      <button aria-label="Добавить: ${slot.label}" title="Добавить карточку">＋</button>
    </div>
    <div class="slot-dropzone" data-day="${dayKey}" data-slot="${slot.id}" data-type="${slot.type}"></div>
  `;
  wrapper.querySelector("button").addEventListener("click", () => openPicker(dayKey, slot.id, slot.type));
  const dropzone = wrapper.querySelector(".slot-dropzone");
  const cards = state.schedule[dayKey]?.[slot.id] || [];
  if (!cards.length) {
    dropzone.innerHTML = `<span class="empty-slot">${slot.hint}</span>`;
  } else {
    cards.forEach(card => dropzone.append(createScheduleCard(card, dayKey, slot.id)));
  }

  dropzone.addEventListener("dragover", event => {
    event.preventDefault();
    dropzone.classList.add("drag-over");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"));
  dropzone.addEventListener("drop", handleDrop);
  return wrapper;
}

function createScheduleCard(card, dayKey, slotId) {
  const element = document.createElement("article");
  element.className = `schedule-card ${card.type}`;
  element.draggable = true;
  element.dataset.card = JSON.stringify(card);
  element.dataset.sourceDay = dayKey;
  element.dataset.sourceSlot = slotId;
  element.innerHTML = `<span>${card.icon || (card.type === "meal" ? "🍽️" : "★")} ${card.name}</span><button class="remove-card" aria-label="Удалить">×</button>`;
  element.addEventListener("dragstart", handleDragStart);
  element.addEventListener("dragend", () => element.classList.remove("dragging"));
  element.querySelector(".remove-card").addEventListener("click", () => removeCard(dayKey, slotId, card.instanceId));
  return element;
}

function renderLibrary() {
  const type = state.activeTab === "activities" ? "activity" : "meal";
  const query = searchInput.value.trim().toLocaleLowerCase("ru");
  const cards = getCards(type).filter(card => card.name.toLocaleLowerCase("ru").includes(query));
  library.innerHTML = "";
  cards.forEach(card => {
    const element = document.createElement("article");
    element.className = `library-card ${card.type}`;
    element.draggable = true;
    element.dataset.card = JSON.stringify(card);
    element.innerHTML = `<span class="card-icon">${card.icon}</span><span>${card.name}</span>`;
    element.addEventListener("dragstart", handleDragStart);
    library.append(element);
  });
  if (!cards.length) library.innerHTML = '<p class="empty-slot">Ничего не нашлось</p>';
}

function renderModal() {
  const query = modalSearch.value.trim().toLocaleLowerCase("ru");
  const cards = getCards(state.modalType).filter(card => card.name.toLocaleLowerCase("ru").includes(query));
  modalGrid.innerHTML = "";
  cards.forEach(card => {
    const button = document.createElement("button");
    button.className = `picker-card ${card.type}`;
    button.innerHTML = `<span class="card-icon">${card.icon}</span><span>${card.name}</span>`;
    button.addEventListener("click", () => addToTarget(card));
    modalGrid.append(button);
  });
  if (!cards.length) modalGrid.innerHTML = '<p class="empty-slot">Ничего не нашлось — можно создать свою карточку.</p>';
}

function handleDragStart(event) {
  event.currentTarget.classList.add("dragging");
  const payload = {
    card: JSON.parse(event.currentTarget.dataset.card),
    sourceDay: event.currentTarget.dataset.sourceDay || null,
    sourceSlot: event.currentTarget.dataset.sourceSlot || null
  };
  event.dataTransfer.effectAllowed = "copyMove";
  event.dataTransfer.setData("application/json", JSON.stringify(payload));
}

function handleDrop(event) {
  event.preventDefault();
  const dropzone = event.currentTarget;
  dropzone.classList.remove("drag-over");
  let payload;
  try {
    payload = JSON.parse(event.dataTransfer.getData("application/json"));
  } catch {
    return;
  }
  if (payload.card.type !== dropzone.dataset.type) {
    showToast(payload.card.type === "meal" ? "Еду можно положить в приём пищи" : "Занятие можно положить между приёмами пищи");
    return;
  }
  if (payload.sourceDay) removeCard(payload.sourceDay, payload.sourceSlot, payload.card.instanceId, false);
  addCard(dropzone.dataset.day, dropzone.dataset.slot, payload.card);
}

function addCard(day, slot, sourceCard) {
  state.schedule[day] ||= {};
  state.schedule[day][slot] ||= [];
  state.schedule[day][slot].push({
    ...sourceCard,
    instanceId: `${Date.now()}-${Math.random().toString(16).slice(2)}`
  });
  saveWeek();
  renderBoard();
}

function removeCard(day, slot, instanceId, rerender = true) {
  const cards = state.schedule[day]?.[slot];
  if (!cards) return;
  state.schedule[day][slot] = cards.filter(card => card.instanceId !== instanceId);
  saveWeek();
  if (rerender) {
    renderBoard();
  }
}

function openDayView(dayKey) {
  window.location.href = `day.html?date=${encodeURIComponent(dayKey)}&week=${encodeURIComponent(weekKey())}`;
}

function openPicker(day = null, slot = null, type = "activity") {
  state.modalTarget = day && slot ? { day, slot } : null;
  state.modalType = type;
  modalSearch.value = "";
  document.querySelector("#modal-kicker").textContent = state.modalTarget ? "Добавить в расписание" : "Новая карточка";
  document.querySelector("#modal-title").textContent = state.modalTarget ? "Выберите карточку" : "Создайте карточку";
  document.querySelector("#modal-tabs").hidden = Boolean(state.modalTarget);
  document.querySelectorAll("[data-modal-type]").forEach(tab => tab.classList.toggle("active", tab.dataset.modalType === type));
  document.querySelector("#custom-card-form").hidden = true;
  pickerModal.hidden = false;
  document.body.style.overflow = "hidden";
  renderModal();
}

function closePicker() {
  pickerModal.hidden = true;
  document.body.style.overflow = "";
}

function addToTarget(card) {
  if (!state.modalTarget) {
    const list = card.type === "activity" ? activities : meals;
    if (!list.some(item => item.name.toLocaleLowerCase("ru") === card.name.toLocaleLowerCase("ru"))) {
      list.push({ ...card, id: `custom-${Date.now()}` });
      saveCustomCards();
    }
    state.activeTab = card.type === "activity" ? "activities" : "meals";
    syncLibraryTabs();
    renderLibrary();
    showToast("Карточка добавлена в коллекцию");
  } else {
    addCard(state.modalTarget.day, state.modalTarget.slot, card);
    showToast("Добавлено в расписание");
  }
  closePicker();
}

function syncLibraryTabs() {
  document.querySelectorAll("[data-tab]").forEach(tab => tab.classList.toggle("active", tab.dataset.tab === state.activeTab));
}

let toastTimer;
function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

document.querySelector("#prev-week").addEventListener("click", () => changeWeek(-7));
document.querySelector("#next-week").addEventListener("click", () => changeWeek(7));
document.querySelector("#today-button").addEventListener("click", () => {
  state.weekStart = startOfWeek(new Date());
  loadWeek();
  renderBoard();
});

function changeWeek(days) {
  state.weekStart.setDate(state.weekStart.getDate() + days);
  loadWeek();
  renderBoard();
}

document.querySelectorAll("[data-tab]").forEach(tab => tab.addEventListener("click", () => {
  state.activeTab = tab.dataset.tab;
  searchInput.value = "";
  syncLibraryTabs();
  renderLibrary();
}));

document.querySelectorAll("[data-modal-type]").forEach(tab => tab.addEventListener("click", () => {
  state.modalType = tab.dataset.modalType;
  document.querySelectorAll("[data-modal-type]").forEach(item => item.classList.toggle("active", item === tab));
  renderModal();
}));

searchInput.addEventListener("input", renderLibrary);
modalSearch.addEventListener("input", renderModal);
document.querySelector("#open-library").addEventListener("click", () => libraryPanel.classList.add("open"));
document.querySelector("#share-week").addEventListener("click", shareWeek);
document.querySelector("#close-library").addEventListener("click", () => libraryPanel.classList.remove("open"));
document.querySelector("#new-card-button").addEventListener("click", () => openPicker());
document.querySelectorAll("[data-close-modal]").forEach(button => button.addEventListener("click", closePicker));
pickerModal.addEventListener("click", event => { if (event.target === pickerModal) closePicker(); });
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (!pickerModal.hidden) closePicker();
});
document.querySelector("#show-custom-form").addEventListener("click", () => {
  const form = document.querySelector("#custom-card-form");
  form.hidden = false;
  document.querySelector("#custom-card-name").focus();
});
document.querySelector("#custom-card-form").addEventListener("submit", event => {
  event.preventDefault();
  const input = document.querySelector("#custom-card-name");
  const name = input.value.trim();
  if (!name) return;
  addToTarget({ name, type: state.modalType, icon: state.modalType === "meal" ? "🍽️" : "★" });
  input.value = "";
});

loadCustomCards();
if (!applySharedPlan()) loadWeek();
renderBoard();
renderLibrary();
