const activityCards = [
  ["Футбол","⚽"],["Испанский язык","¡!"],["Гимнастика","🤸"],["Барабаны","🥁"],
  ["Флейта","♫"],["Чтение и литература","📚"],["Математика","➗"],["Лепка","👐"],
  ["Рисование","🎨"],["Столярные работы","🔨"],["Сборка электроники","⚡"],
  ["Поделки из картона","✂️"],["Другой проект","💡"],["Природоведение","🌿"],
  ["Зарядка","☀️"],["Просмотр мультфильма","📺"]
].map(([name,icon],i)=>({id:`a-${i}`,name,icon,type:"activity"}));

const mealCards = [
  ["Геркулесовая каша","🥣"],["Омлет с хлебом и сосиской","🍳"],["Омлет","🍳"],
  ["Кесадилья","🌮"],["Блинчики","🥞"],["Оладушки","🥞"],["Банановые панкейки","🍌"],
  ["Сырники","🧀"],["Варёное яйцо и бутерброд","🥚"],["Творожная запеканка","🍰"],
  ["Пюре с рыбной котлетой","🐟"],["Пюре с куриной ножкой","🍗"],
  ["Гречка с куриной котлетой","🍲"],["Рис с тунцом","🍚"],["Суп с фрикадельками","🥘"],
  ["Борщ","🥣"],["Пицца","🍕"],["Макароны с куриной подливкой","🍝"],["Пельмени","🥟"],
  ["Свежие овощи","🥒"],["Фрукты","🍎"]
].map(([name,icon],i)=>({id:`m-${i}`,name,icon,type:"meal"}));

const slots = [
  {id:"beforeBreakfast",label:"До завтрака",type:"activity",hint:"Добавить занятие"},
  {id:"breakfast",label:"Завтрак",type:"meal",hint:"Что на завтрак?"},
  {id:"morningActivity",label:"До обеда",type:"activity",hint:"Добавить занятие"},
  {id:"lunch",label:"Обед",type:"meal",hint:"Что на обед?"},
  {id:"afternoonActivity",label:"После обеда",type:"activity",hint:"Добавить занятие"},
  {id:"dinner",label:"Ужин",type:"meal",hint:"Что на ужин?"}
];

const params = new URLSearchParams(location.search);
const sharedPlan = params.get("plan") ? FamilyShare.decode(params.get("plan")) : null;
let currentDate = validDate(params.get("date")) ? params.get("date") : new Date().toISOString().slice(0,10);
const weekStart = sharedPlan?.weekStart || (validDate(params.get("week")) ? params.get("week") : mondayKey(currentDate));
let schedule = {};
let pickerTarget = null;
let activeLibraryType = "activity";

function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value || ""); }
function mondayKey(value) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() - ((date.getDay()+6)%7));
  return date.toISOString().slice(0,10);
}
function storageKey() { return `family-planner:${weekStart}`; }
function load() {
  if (sharedPlan) {
    schedule = sharedPlan.schedule || {};
    localStorage.setItem(storageKey(), JSON.stringify(schedule));
    if (sharedPlan.customCards?.length) {
      localStorage.setItem("family-planner:custom-cards", JSON.stringify(sharedPlan.customCards));
    }
  } else {
    try { schedule = JSON.parse(localStorage.getItem(storageKey())) || {}; } catch { schedule = {}; }
  }
  try {
    (JSON.parse(localStorage.getItem("family-planner:custom-cards")) || []).forEach(card => {
      const list = card.type === "meal" ? mealCards : activityCards;
      if (!list.some(item=>item.id===card.id)) list.push(card);
    });
  } catch {}
}
function save() { localStorage.setItem(storageKey(), JSON.stringify(schedule)); }
function cardsFor(type) { return type === "meal" ? mealCards : activityCards; }
function sharePayload() {
  return {
    version: 1,
    weekStart,
    schedule,
    customCards: [...activityCards,...mealCards].filter(card=>String(card.id).startsWith("custom-"))
  };
}
function shareDay() {
  const url=FamilyShare.createUrl("day.html",sharePayload(),{date:currentDate,week:weekStart});
  FamilyShare.show(url,"Поделиться этим днём");
}

function render() {
  const date = new Date(`${currentDate}T12:00:00`);
  document.title = `${date.toLocaleDateString("ru-RU",{weekday:"long"})} — Наша неделя`;
  document.querySelector("#expanded-title").textContent = date.toLocaleDateString("ru-RU",{weekday:"long"});
  document.querySelector("#expanded-date").textContent = date.toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"});
  document.querySelector("#back-to-week").href = "index.html";
  const root = document.querySelector("#expanded-schedule");
  root.innerHTML = "";
  slots.forEach(slot=>root.append(createSlot(slot)));
  const start = new Date(`${weekStart}T12:00:00`);
  const index = Math.round((date-start)/86400000);
  document.querySelector("#day-prev").disabled = index <= 0;
  document.querySelector("#day-next").disabled = index >= 6;
}

function createSlot(slot) {
  const section = document.createElement("section");
  section.className = `slot expanded-slot ${slot.type}-slot`;
  section.innerHTML = `<div class="slot-label"><span>${slot.label}</span><button aria-label="Добавить: ${slot.label}">＋</button></div><div class="slot-dropzone" data-slot="${slot.id}" data-type="${slot.type}"></div>`;
  section.querySelector("button").addEventListener("click",()=>openPicker(slot));
  const zone = section.querySelector(".slot-dropzone");
  const cards = schedule[currentDate]?.[slot.id] || [];
  if (!cards.length) zone.innerHTML = `<span class="empty-slot">${slot.hint}</span>`;
  else cards.forEach(card=>zone.append(createScheduleCard(card,slot.id)));
  zone.addEventListener("dragover",e=>{e.preventDefault();zone.classList.add("drag-over");});
  zone.addEventListener("dragleave",()=>zone.classList.remove("drag-over"));
  zone.addEventListener("drop",e=>handleDrop(e,slot));
  return section;
}

function createScheduleCard(card,slotId) {
  const item = document.createElement("article");
  item.className = `schedule-card ${card.type}`;
  item.draggable = true;
  item.dataset.card = JSON.stringify(card);
  item.dataset.slot = slotId;
  item.innerHTML = `<span>${card.icon || (card.type==="meal"?"🍽️":"★")} ${card.name}</span><button class="remove-card" aria-label="Удалить">×</button>`;
  item.addEventListener("dragstart",dragStart);
  item.querySelector("button").addEventListener("click",()=>removeCard(slotId,card.instanceId));
  return item;
}

function renderLibrary() {
  const query = document.querySelector("#day-search").value.trim().toLowerCase();
  const root = document.querySelector("#day-card-library");
  root.innerHTML = "";
  cardsFor(activeLibraryType).filter(c=>c.name.toLowerCase().includes(query)).forEach(card=>{
    const item=document.createElement("article");
    item.className=`library-card ${card.type}`;
    item.draggable=true;
    item.dataset.card=JSON.stringify(card);
    item.innerHTML=`<span class="card-icon">${card.icon}</span><span>${card.name}</span>`;
    item.addEventListener("dragstart",dragStart);
    root.append(item);
  });
}

function dragStart(event) {
  event.dataTransfer.setData("application/json",JSON.stringify({
    card:JSON.parse(event.currentTarget.dataset.card),
    sourceSlot:event.currentTarget.dataset.slot || null
  }));
}
function handleDrop(event,slot) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-over");
  let data; try { data=JSON.parse(event.dataTransfer.getData("application/json")); } catch { return; }
  if (data.card.type !== slot.type) return showToast(slot.type==="meal"?"Сюда можно добавить еду":"Сюда можно добавить занятие");
  if (data.sourceSlot) removeCard(data.sourceSlot,data.card.instanceId,false);
  addCard(slot.id,data.card);
}
function addCard(slotId,card) {
  schedule[currentDate] ||= {};
  schedule[currentDate][slotId] ||= [];
  schedule[currentDate][slotId].push({...card,instanceId:`${Date.now()}-${Math.random().toString(16).slice(2)}`});
  save(); render(); closePicker(); showToast("Добавлено в план дня");
}
function removeCard(slotId,id,rerender=true) {
  if (!schedule[currentDate]?.[slotId]) return;
  schedule[currentDate][slotId]=schedule[currentDate][slotId].filter(c=>c.instanceId!==id);
  save(); if(rerender) render();
}

function openPicker(slot) {
  pickerTarget=slot;
  document.querySelector("#day-picker-search").value="";
  document.querySelector("#day-picker").hidden=false;
  document.body.style.overflow="hidden";
  renderPicker();
}
function closePicker() {
  document.querySelector("#day-picker").hidden=true;
  document.body.style.overflow="";
}
function renderPicker() {
  const query=document.querySelector("#day-picker-search").value.trim().toLowerCase();
  const root=document.querySelector("#day-picker-grid");
  root.innerHTML="";
  cardsFor(pickerTarget.type).filter(c=>c.name.toLowerCase().includes(query)).forEach(card=>{
    const button=document.createElement("button");
    button.className=`picker-card ${card.type}`;
    button.innerHTML=`<span class="card-icon">${card.icon}</span><span>${card.name}</span>`;
    button.addEventListener("click",()=>addCard(pickerTarget.id,card));
    root.append(button);
  });
}
function changeDay(offset) {
  const date=new Date(`${currentDate}T12:00:00`);
  date.setDate(date.getDate()+offset);
  currentDate=date.toISOString().slice(0,10);
  history.replaceState(null,"",`day.html?date=${currentDate}&week=${weekStart}`);
  render();
}
let toastTimer;
function showToast(text) {
  const toast=document.querySelector("#toast");
  toast.textContent=text; toast.classList.add("show");
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove("show"),2200);
}

document.querySelector("#day-prev").addEventListener("click",()=>changeDay(-1));
document.querySelector("#day-next").addEventListener("click",()=>changeDay(1));
document.querySelector("#day-open-library").addEventListener("click",()=>document.querySelector("#day-library").classList.add("open"));
document.querySelector("#share-day").addEventListener("click",shareDay);
document.querySelector("#day-close-library").addEventListener("click",()=>document.querySelector("#day-library").classList.remove("open"));
document.querySelectorAll("[data-day-tab]").forEach(tab=>tab.addEventListener("click",()=>{
  activeLibraryType=tab.dataset.dayTab;
  document.querySelectorAll("[data-day-tab]").forEach(t=>t.classList.toggle("active",t===tab));
  renderLibrary();
}));
document.querySelector("#day-search").addEventListener("input",renderLibrary);
document.querySelector("#day-picker-search").addEventListener("input",renderPicker);
document.querySelector("#close-day-picker").addEventListener("click",closePicker);
document.querySelector("#day-picker").addEventListener("click",e=>{if(e.target.id==="day-picker")closePicker();});
document.querySelector("#day-custom-form").addEventListener("submit",event=>{
  event.preventDefault();
  const input=document.querySelector("#day-custom-name");
  const name=input.value.trim(); if(!name)return;
  const card={id:`custom-${Date.now()}`,name,type:pickerTarget.type,icon:pickerTarget.type==="meal"?"🍽️":"★"};
  const list=cardsFor(card.type); list.push(card);
  const custom=[...activityCards,...mealCards].filter(c=>String(c.id).startsWith("custom-"));
  localStorage.setItem("family-planner:custom-cards",JSON.stringify(custom));
  input.value=""; addCard(pickerTarget.id,card); renderLibrary();
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!document.querySelector("#day-picker").hidden)closePicker();});

load(); render(); renderLibrary();
