import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  updateDoc,
  query,
  orderBy,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  createLog
} from "./logs.js";

function formatBrazilianDate(dateString) {

  const date = parseDateValue(dateString);

  return date.toLocaleDateString("pt-BR");
}


function parseDateValue(dateValue) {

  if (typeof dateValue === "string") {

    const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
  }

  return new Date(dateValue);
}


function getTodayDateKey() {

  const today = new Date();

  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}


function getDateKey(dateString) {

  const date = parseDateValue(dateString);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}


function formatCalendarDay(dateString) {

  const date = parseDateValue(dateString);

  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit"
  });
}


function isWeekday(dateString) {

  const date = parseDateValue(dateString);
  const dayOfWeek = date.getDay();

  return dayOfWeek >= 1 && dayOfWeek <= 5;
}


// ============================================
// FIREBASE CONFIG
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyAPK8IRNmA87EjPrLxcCtNP8HzfHlX3HsY",
  authDomain: "mentorias-impulse.firebaseapp.com",
  projectId: "mentorias-impulse",
  storageBucket: "mentorias-impulse.firebasestorage.app",
  messagingSenderId: "1041303600981",
  appId: "1:1041303600981:web:de356a424edb93de97b9dc"

};


// ============================================
// TABLE ORDER
// ============================================

// true = crescente
// false = decrescente

const ASCENDING_ORDER = true;


// ============================================
// INIT
// ============================================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ============================================
// ELEMENTS
// ============================================

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userName = document.getElementById("user-name");
const slotsContainer = document.getElementById("slots-container");
const appModal = document.getElementById("app-modal");
const appModalTitle = document.getElementById("app-modal-title");
const appModalMessage = document.getElementById("app-modal-message");
const currentDateLabel = document.getElementById("current-date-label");
const rescheduleModal = document.getElementById("reschedule-modal");
const rescheduleForm = document.getElementById("reschedule-form");
const rescheduleDateSelect = document.getElementById("reschedule-date");
const rescheduleHourSelect = document.getElementById("reschedule-hour");
const rescheduleMentorSelect = document.getElementById("reschedule-mentor");

let rescheduleSourceSlotId = null;


function showModal(title, message) {

  appModalTitle.innerText = title;
  appModalMessage.innerText = message;
  appModal.classList.remove("d-none");
}


function closeModal() {

  appModal.classList.add("d-none");
}


appModal.addEventListener("click", (event) => {

  const target = event.target;

  if (target.matches("[data-modal-close]")) {
    closeModal();
  }
});


function updateCurrentDateLabel() {

  const now = new Date();
  const formattedDate = now.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  });

  currentDateLabel.innerText = `Hoje é ${formattedDate}`;
}


function scheduleDailyDateRefresh() {

  const now = new Date();
  const nextDay = new Date(now);
  nextDay.setDate(now.getDate() + 1);
  nextDay.setHours(0, 0, 2, 0);

  const msToNextRefresh = nextDay.getTime() - now.getTime();

  setTimeout(() => {
    updateCurrentDateLabel();
    scheduleDailyDateRefresh();
  }, msToNextRefresh);
}


function closeRescheduleModal() {

  rescheduleModal.classList.add("d-none");
  rescheduleSourceSlotId = null;
  rescheduleForm.reset();
}


rescheduleModal.addEventListener("click", (event) => {

  const target = event.target;

  if (target.matches("[data-reschedule-close]")) {
    closeRescheduleModal();
  }
});


function setSelectOptions(selectElement, options) {

  selectElement.innerHTML = "";

  options.forEach((option) => {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    selectElement.appendChild(element);
  });
}


function getMonthBounds() {

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const todayDateKey = getTodayDateKey();
  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const start = todayDateKey > monthStart ? todayDateKey : monthStart;
  const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, "0")}`;

  return { start, end, year, month };
}


function getRescheduleBounds() {

  const start = getTodayDateKey();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 10);

  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;

  return { start, end };
}


function getWeekdayOptionsInRange(startDateKey, endDateKey) {

  const options = [];
  const startDate = parseDateValue(startDateKey);
  const endDate = parseDateValue(endDateKey);

  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {

    const dayOfWeek = date.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }

    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    options.push({
      value: dateKey,
      label: date.toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit"
      })
    });
  }

  return options;
}


function getFirstWeekdayOfMonth(year, month, startDateKey) {

  const startDay = Number(startDateKey.split("-")[2]);

  for (let day = startDay; day <= 31; day += 1) {

    const date = new Date(year, month, day);

    if (date.getMonth() !== month) {
      break;
    }

    const dayOfWeek = date.getDay();

    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  return null;
}


function enforceWeekdayOnRescheduleDate() {

  const selectedDate = rescheduleDateSelect.value;

  if (!selectedDate) {
    return false;
  }

  if (isWeekday(selectedDate)) {
    return true;
  }

  showModal("Data inválida", "Fim de semana não é permitido. Escolha de segunda a sexta.");

  const fallbackDate = rescheduleDateSelect.dataset.fallbackDate || "";
  rescheduleDateSelect.value = fallbackDate;

  return false;
}


function getAvailableMentorsForReschedule(dateKey, hour) {

  if (!dateKey || !hour) {
    return [];
  }

  const mentorSet = new Set();

  slotsData.forEach((slot) => {

    const isSameDateAndHour = getDateKey(slot.date) === dateKey && slot.hour === hour;

    if (!isSameDateAndHour) {
      return;
    }

    const isSlotAvailable = !slot.booked || slot.id === rescheduleSourceSlotId;

    if (isSlotAvailable) {
      mentorSet.add(slot.mentor);
    }
  });

  return Array.from(mentorSet).sort((firstMentor, secondMentor) => firstMentor.localeCompare(secondMentor));
}


function refreshRescheduleMentorOptions() {

  const selectedDate = rescheduleDateSelect.value;
  const selectedHour = rescheduleHourSelect.value;
  const previousMentor = rescheduleMentorSelect.value;
  const mentorOptions = getAvailableMentorsForReschedule(selectedDate, selectedHour);

  if (!mentorOptions.length) {

    setSelectOptions(rescheduleMentorSelect, [{
      value: "",
      label: "Sem mentor disponível"
    }]);

    rescheduleMentorSelect.value = "";
    rescheduleMentorSelect.disabled = true;
    return;
  }

  setSelectOptions(rescheduleMentorSelect, mentorOptions.map((mentor) => ({ value: mentor, label: mentor })));
  rescheduleMentorSelect.disabled = false;

  if (mentorOptions.includes(previousMentor)) {
    rescheduleMentorSelect.value = previousMentor;
  }
}


rescheduleDateSelect.addEventListener("change", () => {
  const isValidWeekday = enforceWeekdayOnRescheduleDate();

  if (!isValidWeekday) {
    return;
  }

  refreshRescheduleMentorOptions();
});


rescheduleHourSelect.addEventListener("change", () => {
  refreshRescheduleMentorOptions();
});


window.openRescheduleModal = (sourceSlotId) => {

  const user = auth.currentUser;

  if (!user) {
    showModal("Faça login primeiro", "Você precisa entrar com sua conta Google para remarcar um horário.");
    return;
  }

  const sourceSlot = slotsData.find((slot) => slot.id === sourceSlotId);

  if (!sourceSlot || sourceSlot.studentId !== user.uid) {
    showModal("Não foi possível remarcar", "Apenas o dono do agendamento pode remarcar este horário.");
    return;
  }

  rescheduleSourceSlotId = sourceSlotId;

  const rescheduleBounds = getRescheduleBounds();
  const weekdayOptions = getWeekdayOptionsInRange(rescheduleBounds.start, rescheduleBounds.end);

  if (!weekdayOptions.length) {
    showModal("Sem opções de remarcação", "Não há dias úteis disponíveis nos próximos dias.");
    return;
  }

  setSelectOptions(rescheduleDateSelect, weekdayOptions);
  rescheduleDateSelect.dataset.fallbackDate = weekdayOptions[0].value;

  const hours = Array.from(new Set(slotsData.map((slot) => slot.hour))).sort((firstHour, secondHour) => {
    return firstHour.localeCompare(secondHour);
  });

  if (!hours.length) {
    showModal("Sem opções de remarcação", "Não há horários ou mentores cadastrados para remarcar.");
    return;
  }

  setSelectOptions(rescheduleHourSelect, hours.map((hour) => ({ value: hour, label: hour })));
  refreshRescheduleMentorOptions();

  rescheduleModal.classList.remove("d-none");
};


rescheduleForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  const user = auth.currentUser;

  if (!user || !rescheduleSourceSlotId) {
    closeRescheduleModal();
    return;
  }

  const selectedDate = rescheduleDateSelect.value;
  const selectedHour = rescheduleHourSelect.value;
  const selectedMentor = rescheduleMentorSelect.value;

  if (!selectedDate) {
    showModal("Data inválida", "Selecione um dia para remarcar.");
    return;
  }

  if (!enforceWeekdayOnRescheduleDate()) {
    return;
  }

  if (!selectedMentor) {
    showModal("Mentor indisponível", "Não há mentor disponível para o dia e horário selecionados.");
    return;
  }

  const targetSlot = slotsData.find((slot) =>
    slot.id !== rescheduleSourceSlotId &&
    getDateKey(slot.date) === selectedDate &&
    slot.hour === selectedHour &&
    slot.mentor === selectedMentor &&
    !slot.booked
  );

  if (!targetSlot) {
    showModal("Horário indisponível", "Esse mentor não está disponível para este dia e horário.");
    return;
  }

  const sourceRef = doc(db, "slots", rescheduleSourceSlotId);
  const sourceSnapshot = await getDoc(sourceRef);

  if (!sourceSnapshot.exists()) {
    showModal("Não foi possível remarcar", "O horário original não existe mais.");
    closeRescheduleModal();
    return;
  }

  const sourceSlot = sourceSnapshot.data();

  if (sourceSlot.studentId !== user.uid) {
    showModal("Não foi possível remarcar", "Este agendamento não pertence mais ao seu usuário.");
    closeRescheduleModal();
    return;
  }

  const sourceDateKey = getDateKey(sourceSlot.date);

  if (sourceDateKey === selectedDate && sourceSlot.hour === selectedHour && sourceSlot.mentor === selectedMentor) {
    showModal("Nenhuma alteração", "Escolha um dia, horário ou mentor diferente do agendamento atual.");
    return;
  }

  const targetRef = doc(db, "slots", targetSlot.id);
  const targetSnapshot = await getDoc(targetRef);

  if (!targetSnapshot.exists()) {
    showModal("Horário indisponível", "Esse horário deixou de existir. Escolha outro.");
    closeRescheduleModal();
    return;
  }

  const currentTarget = targetSnapshot.data();

  if (currentTarget.booked) {
    showModal("Horário indisponível", "Esse horário acabou de ser reservado. Escolha outro.");
    closeRescheduleModal();
    return;
  }

  await updateDoc(targetRef, {
    booked: true,
    studentId: user.uid,
    studentName: user.displayName
  });

  const targetSlotId = targetSlot.id;

  await updateDoc(sourceRef, {
    booked: false,
    studentId: null,
    studentName: null
  });

  await createLog(app, {
    action: "RESCHEDULE_SLOT",
    fromSlotId: rescheduleSourceSlotId,
    toSlotId: targetSlotId,
    userId: user.uid,
    userName: user.displayName
  });

  closeRescheduleModal();
});


// ============================================
// AUTH
// ============================================

const provider = new GoogleAuthProvider();

loginBtn.addEventListener("click", async () => {

  try {
    await signInWithPopup(auth, provider);
  }
  catch (error) {
    console.error(error);

    if (error?.code === "auth/cancelled-popup-request" || error?.code === "auth/popup-closed-by-user") {
      showModal("Login cancelado", "Você fechou a janela de login antes de concluir.");
      return;
    }

    showModal("Não foi possível entrar", error?.message || "Tente novamente em instantes.");
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});


// ============================================
// USER STATE
// ============================================

onAuthStateChanged(auth, (user) => {

  if (user) {

    closeModal();

    userName.innerText = user.displayName;

    loginBtn.classList.add("d-none");
    logoutBtn.classList.remove("d-none");
  }
  else {

    userName.innerText = "";

    loginBtn.classList.remove("d-none");
    logoutBtn.classList.add("d-none");
  }
  renderSlots()
});


// ============================================
// LOAD SLOTS
// ============================================

let slotsData = [];

function loadSlots() {

  const slotsQuery = query(
    collection(db, "slots"),
    orderBy("date", ASCENDING_ORDER ? "asc" : "desc")
  );

  onSnapshot(slotsQuery, (querySnapshot) => {

    slotsData = [];

    querySnapshot.forEach((slotDoc) => {

      slotsData.push({
        id: slotDoc.id,
        ...slotDoc.data()
      });
    });

    renderSlots();

    const isRescheduleModalOpen = !rescheduleModal.classList.contains("d-none");

    if (isRescheduleModalOpen) {
      refreshRescheduleMentorOptions();
    }
  });
}

function renderSlots() {

  slotsContainer.innerHTML = "";

  const currentUser = auth.currentUser;

  const todayDateKey = getTodayDateKey();

  const weekdaySlots = slotsData.filter((slot) => {

    const slotDateKey = getDateKey(slot.date);

    return isWeekday(slot.date) && slotDateKey >= todayDateKey;
  });

  const groupedSlots = weekdaySlots.reduce((groups, slot) => {

    const dateKey = getDateKey(slot.date);

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }

    groups[dateKey].push(slot);

    return groups;
  }, {});

  const orderedDates = Object.keys(groupedSlots).sort((firstDate, secondDate) => {

    if (ASCENDING_ORDER) {
      return firstDate.localeCompare(secondDate);
    }

    return secondDate.localeCompare(firstDate);
  });

  orderedDates.forEach((dateKey) => {

    const daySlots = groupedSlots[dateKey].sort((firstSlot, secondSlot) => {
      return firstSlot.hour.localeCompare(secondSlot.hour);
    });

    const dayColumn = document.createElement("section");
    dayColumn.className = "day-column";

    const dayLabel = daySlots[0] ? formatCalendarDay(daySlots[0].date) : dateKey;

    dayColumn.innerHTML = `
      <div class="day-column__header">
        <span class="day-column__label">${dayLabel}</span>
        <span class="day-column__count">${daySlots.length} horário(s)</span>
      </div>

      <div class="day-column__body"></div>
    `;

    const dayBody = dayColumn.querySelector(".day-column__body");

    daySlots.forEach((slot) => {

      const currentSlot = document.createElement("article");
      let slotClass = "slot-card";
      const statusDotHTML = slot.booked ? '<span class="slot-status-dot"></span>' : "";

      let statusHTML = "";

      if (!slot.booked) {

        slotClass = "slot-card slot-card--available";

        statusHTML = `
          <button
            class="btn btn-success btn-sm slot-action"
            onclick="bookSlot('${slot.id}')"
          >
            Agendar
          </button>
        `;
      }
      else if (currentUser && slot.studentId === currentUser.uid) {

        slotClass = "slot-card slot-card--booked";

        statusHTML = `
          <span class="badge text-bg-primary slot-badge">
            Agendado por você
          </span>

          <button
            class="btn btn-outline-danger btn-sm slot-action"
            onclick="unbookSlot('${slot.id}')"
          >
            Desmarcar
          </button>

          <button
            class="btn btn-outline-primary btn-sm slot-action"
            onclick="openRescheduleModal('${slot.id}')"
          >
            Remarcar
          </button>
        `;
      }
      else {

        slotClass = "slot-card slot-card--busy";

        statusHTML = `
          <div class="slot-meta" style="width: 100%;">
            <span class="slot-meta__label">Agendado</span>
            <strong>${slot.studentName}</strong>
          </div>
        `;
      }

      currentSlot.className = slotClass;

      currentSlot.innerHTML = `
        <div class="slot-card__top">
          <span class="slot-time-pill">${slot.hour}</span>
          ${statusDotHTML}
        </div>

        <div class="slot-meta slot-meta--mentor">
          <span class="slot-meta__label">Mentor</span>
          <strong>${slot.mentor}</strong>
        </div>

        <div class="slot-card__footer" style="width: 100%;">
          ${statusHTML}
        </div>
      `;

      dayBody.appendChild(currentSlot);
    });

    slotsContainer.appendChild(dayColumn);
  });
}

// ============================================
// BOOK SLOT
// ============================================

window.bookSlot = async (slotId) => {

  const user = auth.currentUser;

  if (!user) {
    showModal("Faça login primeiro", "Você precisa entrar com sua conta Google para agendar um horário.");
    return;
  }

  const slotRef = doc(db, "slots", slotId);

  await updateDoc(slotRef, {
    booked: true,
    studentId: user.uid,
    studentName: user.displayName
  });

  await createLog(app, {
    action: "BOOK_SLOT",
    slotId,
    userId: user.uid,
    userName: user.displayName
  });
};


// ============================================
// UNBOOK SLOT
// ============================================

window.unbookSlot = async (slotId) => {

  const user = auth.currentUser;

  if (!user) {
    return;
  }

  const slotRef = doc(db, "slots", slotId);

  const slotSnapshot = await getDoc(slotRef);

  if (!slotSnapshot.exists()) {
    return;
  }

  const slot = slotSnapshot.data();

  if (slot.studentId !== user.uid) {

    showModal(
      "Ação não permitida",
      "Você só pode desmarcar horários reservados por você."
    );

    return;
  }

  await updateDoc(slotRef, {
    booked: false,
    studentId: null,
    studentName: null
  });

  await createLog(app, {
    action: "UNBOOK_SLOT",
    slotId,
    userId: user.uid,
    userName: user.displayName
  });
};


// ============================================
// CREATE INITIAL SLOTS
// ============================================

// EXECUTE UMA VEZ E DEPOIS COMENTE


// ============================================
// INIT REALTIME LISTENER
// ============================================

loadSlots();

updateCurrentDateLabel();
scheduleDailyDateRefresh();



