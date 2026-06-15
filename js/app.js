import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
  where,
  query
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ============================================
// DOM ELEMENTS
// ============================================

const slotsContainer = document.getElementById("slots-container");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userNameSpan = document.getElementById("user-name");
const currentDateLabel = document.getElementById("current-date-label");
const appModal = document.getElementById("app-modal");
const appModalTitle = document.getElementById("app-modal-title");
const appModalMessage = document.getElementById("app-modal-message");
const rescheduleModal = document.getElementById("reschedule-modal");
const rescheduleForm = document.getElementById("reschedule-form");
const rescheduleDateSelect = document.getElementById("reschedule-date");
const rescheduleHourSelect = document.getElementById("reschedule-hour");
const rescheduleMentorSelect = document.getElementById("reschedule-mentor");

// ============================================
// INITIAL SETUP
// ============================================

function getInitialDaysToShow() {
  if (window.innerWidth <= 480) return 1;
  if (window.innerWidth <= 768) return 2;
  return 3;
}

// ============================================
// STATE
// ============================================

let slotsData = [];
let selectedSlotId = null;
let daysToShow = getInitialDaysToShow();
let expandedDays = new Set();

// ============================================
// HELPERS
// ============================================

function getDateKey(dateString) {
  return dateString.split("T")[0];
}

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDesktopSlotsToShow() {
  const cardMinWidth = 200; // mínima largura do card em css
  const gap = 16; // gap do grid em pixels
  const availableWidth = slotsContainer.clientWidth;
  const cols = Math.floor((availableWidth + gap) / (cardMinWidth + gap));
  return Math.max(2, cols);
}

function isWeekday(dateString) {
  const date = new Date(dateString + "T00:00:00");
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function formatCalendarDay(dateString) {
  const date = new Date(dateString + "T00:00:00");
  const options = { weekday: "short", month: "short", day: "numeric" };
  return date.toLocaleDateString("pt-BR", options);
}

// normalize name to filename-friendly string (remove accents, spaces)
function normalizeFileName(name) {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

// ============================================
// FETCH SLOTS
// ============================================

async function loadSlots() {
  try {
    const querySnapshot = await getDocs(collection(db, "slots"));
    slotsData = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    renderSlots();
    updateCurrentDate();
  } catch (error) {
    console.error("Erro ao carregar slots:", error);
    showModal("Erro", "Não foi possível carregar os horários");
  }
}

// ============================================
// RENDER SLOTS
// ============================================

function renderSlots() {

  slotsContainer.innerHTML = "";

  const currentUser = auth.currentUser;
  const todayDateKey = getTodayDateKey();
  const windowWidth = window.innerWidth;
  const isMobile = windowWidth <= 768;
  const maxSlotsToShow = isMobile ? 1 : getDesktopSlotsToShow();

  const weekdaySlots = slotsData.filter((slot) => {
    const slotDateKey = getDateKey(slot.date);

    return (
      isWeekday(slot.date) &&
      slotDateKey >= todayDateKey
    );
  }).sort((a, b) => {
    if (a.date !== b.date) {
      return new Date(a.date) - new Date(b.date);
    }
    return a.hour.localeCompare(b.hour);
  });

  const groupedByDate = {};
  weekdaySlots.forEach((slot) => {
    const dateKey = getDateKey(slot.date);
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = [];
    }
    groupedByDate[dateKey].push(slot);
  });

  const allDates = Object.entries(groupedByDate);
  const visibleDates = allDates.slice(0, daysToShow);

  visibleDates.forEach(([dateKey, daySlots]) => {
    
    const dayContainer = document.createElement("div");
    dayContainer.className = "day-section";

    const dayHeader = document.createElement("div");
    dayHeader.className = "day-header";
    dayHeader.innerHTML = `
      <h3>${formatCalendarDay(daySlots[0].date)}</h3>
      <span class="slot-count">${daySlots.length} horários</span>
    `;
    dayContainer.appendChild(dayHeader);

    const dayGrid = document.createElement("div");
    dayGrid.className = "day-grid";

    const isExpanded = expandedDays.has(dateKey);
    
    // Se não expandido, mostra até maxSlotsToShow. Se expandido, mostra todos.
    const slotsToShow = isExpanded ? daySlots : daySlots.slice(0, maxSlotsToShow);

    slotsToShow.forEach((slot) => {
      const card = document.createElement("div");

      let statusClass = "available";
      let buttonHTML = "";

      if (!slot.booked) {

        statusClass = "available";

        buttonHTML = `
          <button
            class="schedule-btn"
            onclick="window.bookSlot('${slot.id}')"
          >
            Agendar
          </button>
        `;
      }

      else if (
        currentUser &&
        slot.studentId === currentUser.uid
      ) {

        statusClass = "booked";

        buttonHTML = `
          <div class="booked-badge">
            Agendado por você
          </div>

          <button
            class="schedule-btn secondary"
            onclick="window.openRescheduleModal('${slot.id}')"
          >
            Remarcar
          </button>
        `;
      }

      else {

        statusClass = "busy";

        buttonHTML = `
          <div class="occupied-badge">
            Agendado: ${slot.studentName}
          </div>
        `;
      }

      card.className = `
        mentor-card
        ${statusClass}
      `;

      card.innerHTML = `
        <div class="mentor-time">
          ${slot.hour}
        </div>

        <div class="mentor-label">
          MENTOR
        </div>

        <div class="mentor-name">
          ${slot.mentor}
        </div>

        <div class="mentor-footer">
          ${buttonHTML}
        </div>
      `;

      dayGrid.appendChild(card);
    });

    dayContainer.appendChild(dayGrid);

    // Mostra botão para expandir/recolher os horários do dia
    if (daySlots.length > maxSlotsToShow) {
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "expand-day-btn";
      toggleBtn.type = "button";

      if (isExpanded) {
        toggleBtn.textContent = "Ver menos horários";
        toggleBtn.onclick = function() {
          expandedDays.delete(dateKey);
          renderSlots();
        };
      } else {
        toggleBtn.textContent = `Ver mais horários (${daySlots.length - maxSlotsToShow})`;
        toggleBtn.onclick = function() {
          expandedDays.add(dateKey);
          renderSlots();
        };
      }

      dayContainer.appendChild(toggleBtn);
    }

    slotsContainer.appendChild(dayContainer);
  });

  // Adicionar botão "Ver mais dias" se houver mais dias
  if (allDates.length > daysToShow) {
    const loadMoreBtn = document.createElement("button");
    loadMoreBtn.className = "load-more-btn";
    loadMoreBtn.textContent = `Ver mais dias (${allDates.length - daysToShow} dias)`;
    loadMoreBtn.type = "button";
    
    loadMoreBtn.onclick = function() {
      daysToShow += 3;
      renderSlots();
    };
    
    slotsContainer.appendChild(loadMoreBtn);
  }
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function showModal(title, message) {
  appModalTitle.textContent = title;
  appModalMessage.textContent = message;
  appModal.classList.remove("d-none");
}

function showHtmlModal(title, html) {
  appModalTitle.textContent = title;
  appModalMessage.innerHTML = html;
  appModal.classList.remove("d-none");
}

function openMentorScheduleModal(mentorName) {
  const mentor = mentoresData.find(m => (m.shortName || m.name) === mentorName);
  if (!mentor) {
    showModal('Erro', 'Mentor não encontrado');
    return;
  }

  let html = `<p class="mentor-description">${mentor.description}</p>`;
  html += `<div class="mentor-schedule">`;
  Object.keys(mentor.schedule).forEach(day => {
    html += `<div class="mentor-day-schedule"><div class="mentor-day-name">${day}</div><div class="mentor-times">`;
    mentor.schedule[day].forEach(time => {
      html += `<span class="time-badge">${time}</span>`;
    });
    html += `</div></div>`;
  });
  html += `</div>`;

  showHtmlModal(`Horários de ${mentor.name}`, html);
}

window.openMentorScheduleModal = openMentorScheduleModal;

function closeModal() {
  appModal.classList.add("d-none");
}

function populateRescheduleOptions(mentorName, selectedDate = null) {
  const filteredSlots = slotsData.filter((slot) => {
    return (
      slot.mentor === mentorName &&
      !slot.booked &&
      slot.id !== selectedSlotId
    );
  });

  const uniqueDates = [...new Set(filteredSlots.map((s) => s.date))].sort();
  rescheduleDateSelect.innerHTML = "";
  uniqueDates.forEach((date) => {
    const option = document.createElement("option");
    option.value = date;
    option.textContent = formatCalendarDay(date);
    rescheduleDateSelect.appendChild(option);
  });

  const dateToUse = selectedDate && uniqueDates.includes(selectedDate)
    ? selectedDate
    : uniqueDates[0] || "";

  if (dateToUse) {
    rescheduleDateSelect.value = dateToUse;
  }

  const hoursForDate = filteredSlots
    .filter((slot) => slot.date === dateToUse)
    .map((s) => s.hour);

  const uniqueHours = [...new Set(hoursForDate)].sort();
  rescheduleHourSelect.innerHTML = "";
  uniqueHours.forEach((hour) => {
    const option = document.createElement("option");
    option.value = hour;
    option.textContent = hour;
    rescheduleHourSelect.appendChild(option);
  });

  if (filteredSlots.length === 0) {
    const noOption = document.createElement("option");
    noOption.value = "";
    noOption.textContent = "Nenhum horário disponível para este mentor";
    rescheduleDateSelect.appendChild(noOption);
    rescheduleHourSelect.appendChild(noOption.cloneNode(true));
  } else if (uniqueHours.length === 0) {
    const noHourOption = document.createElement("option");
    noHourOption.value = "";
    noHourOption.textContent = "Nenhum horário disponível nesta data";
    rescheduleHourSelect.appendChild(noHourOption);
  }
}

function openRescheduleModal(slotId) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    showModal("Aviso", "Você precisa estar logado para remarcar");
    return;
  }

  selectedSlotId = slotId;
  const currentSlot = slotsData.find((slot) => slot.id === slotId);
  if (!currentSlot) {
    showModal("Erro", "Horário não encontrado");
    return;
  }

  // Populate mentor options
  rescheduleMentorSelect.innerHTML = "";
  const uniqueMentors = [...new Set(slotsData.map((s) => s.mentor))].sort();
  uniqueMentors.forEach((mentor) => {
    const option = document.createElement("option");
    option.value = mentor;
    option.textContent = mentor;
    if (mentor === currentSlot.mentor) {
      option.selected = true;
    }
    rescheduleMentorSelect.appendChild(option);
  });

  populateRescheduleOptions(currentSlot.mentor);
  rescheduleModal.classList.remove("d-none");
}

function closeRescheduleModal() {
  rescheduleModal.classList.add("d-none");
}

rescheduleMentorSelect.addEventListener("change", () => {
  const mentorName = rescheduleMentorSelect.value;
  if (mentorName) {
    populateRescheduleOptions(mentorName, rescheduleDateSelect.value);
  }
});

rescheduleDateSelect.addEventListener("change", () => {
  const mentorName = rescheduleMentorSelect.value;
  if (mentorName) {
    populateRescheduleOptions(mentorName, rescheduleDateSelect.value);
  }
});

// ============================================
// BOOK SLOT
// ============================================

window.bookSlot = async function(slotId) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    showModal("Aviso", "Você precisa fazer login para agendar");
    return;
  }

  try {
    const slotDocRef = doc(db, "slots", slotId);
    await updateDoc(slotDocRef, {
      booked: true,
      studentId: currentUser.uid,
      studentName: currentUser.displayName || "Usuário"
    });

    showModal("Sucesso", "Horário agendado com sucesso!");
    await loadSlots();
  } catch (error) {
    console.error("Erro ao agendar:", error);
    showModal("Erro", "Não foi possível agendar o horário");
  }
};

// ============================================
// RESCHEDULE SLOT
// ============================================

window.openRescheduleModal = openRescheduleModal;

rescheduleForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const newDate = rescheduleDateSelect.value;
  const newHour = rescheduleHourSelect.value;
  const newMentor = rescheduleMentorSelect.value;

  try {
    // Find the new slot
    const newSlot = slotsData.find(
      s => s.date === newDate && s.hour === newHour && s.mentor === newMentor
    );

    if (!newSlot) {
      showModal("Erro", "Horário não encontrado");
      return;
    }

    if (newSlot.booked) {
      showModal("Erro", "Este horário já está agendado");
      return;
    }

    const currentUser = auth.currentUser;

    // Clear old slot
    const oldSlotDocRef = doc(db, "slots", selectedSlotId);
    await updateDoc(oldSlotDocRef, {
      booked: false,
      studentId: null,
      studentName: null
    });

    // Book new slot
    const newSlotDocRef = doc(db, "slots", newSlot.id);
    await updateDoc(newSlotDocRef, {
      booked: true,
      studentId: currentUser.uid,
      studentName: currentUser.displayName || "Usuário"
    });

    closeRescheduleModal();
    showModal("Sucesso", "Horário remarcado com sucesso!");
    await loadSlots();
  } catch (error) {
    console.error("Erro ao remarcar:", error);
    showModal("Erro", "Não foi possível remarcar o horário");
  }
});

// ============================================
// AUTHENTICATION
// ============================================

loginBtn.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    updateAuthUI(result.user);
  } catch (error) {
    console.error("Erro ao fazer login:", error);
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    updateAuthUI(null);
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
  }
});

auth.onAuthStateChanged((user) => {
  updateAuthUI(user);
  loadSlots();
});

function updateAuthUI(user) {
  if (user) {
    userNameSpan.textContent = user.displayName || "Usuário";
    loginBtn.classList.add("d-none");
    logoutBtn.classList.remove("d-none");
  } else {
    userNameSpan.textContent = "";
    loginBtn.classList.remove("d-none");
    logoutBtn.classList.add("d-none");
  }
}

// ============================================
// UPDATE CURRENT DATE
// ============================================

function updateCurrentDate() {
  const today = new Date();
  const options = { day: "2-digit", month: "2-digit" };
  const dateStr = today.toLocaleDateString("pt-BR", options);
  currentDateLabel.textContent = `Hoje é ${dateStr}`;
}

window.addEventListener("resize", () => {
  daysToShow = getInitialDaysToShow();
  renderSlots();
});

// ============================================
// MODAL CLOSE BUTTONS
// ============================================

document.querySelectorAll("[data-modal-close]").forEach(btn => {
  btn.addEventListener("click", closeModal);
});

document.querySelectorAll("[data-reschedule-close]").forEach(btn => {
  btn.addEventListener("click", closeRescheduleModal);
});

// ============================================
// PAGE NAVIGATION
// ============================================

const mentoresData = [
  {
    name: "André Trigueiro",
    shortName: "André",
    icon: "bi-person-circle",
    description: "Sou de Natal - RN e atendo mentorias com foco em planejamento e performance.",
    schedule: {
      Quarta: [
        "18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30"
      ],
      Sexta: [
        "16:00","16:30","17:00","17:30","18:00","18:30"
      ]
    }
  },
  {
    name: "Manoel Paixão",
    shortName: "Manoel",
    icon: "bi-person-circle",
    description: "Sou de Recife - PE e ajudo com carreira e estudos para resultados consistentes.",
    schedule: {
      Quarta: [
        "19:00","19:30","20:00","20:30","21:00","21:30"
      ]
    }
  },
  {
    name: "Matheus Santos",
    shortName: "Matheus",
    icon: "bi-person-circle",
    description: "Sou de Fortaleza - CE e trabalho com estratégias práticas para seu desenvolvimento.",
    schedule: {
      Quarta: [
        "19:00","19:30","20:00","20:30","21:00","21:30"
      ],
      Quinta: [
        "19:00","19:30","20:00","20:30","21:00","21:30"
      ]
    }
  }
];

function showPage(pageName) {
  const agendaPage = document.getElementById("agenda-page");
  const mentoresPage = document.getElementById("mentores-page");
  const pageTitle = document.getElementById("page-title");
  const pageSubtitle = document.getElementById("page-subtitle");

  if (pageName === "mentores") {
    agendaPage.classList.add("d-none");
    mentoresPage.classList.remove("d-none");
    pageTitle.textContent = "Nossos Mentores";
    pageSubtitle.textContent = "Conheça os mentores disponíveis";
    renderMentores();
  } else {
    agendaPage.classList.remove("d-none");
    mentoresPage.classList.add("d-none");
    pageTitle.textContent = "Agendador de Mentoria";
    pageSubtitle.textContent = "Escolha um horário disponível";
  }
}

function renderMentores() {
  const mentoresContainer = document.getElementById("mentores-container");
  mentoresContainer.innerHTML = "";

  // helper link to imagens folder + suggested filenames
  const helper = document.createElement('div');
  helper.className = 'imagens-helper';
  const suggested = mentoresData.map(m => normalizeFileName(m.shortName || m.name) + '.jpeg').join(', ');

  mentoresData.forEach((mentor) => {
    // Contar horários disponíveis do mentor por dia
    const availableByDay = {};
    Object.keys(mentor.schedule).forEach((day) => {
      const times = mentor.schedule[day];
      const count = slotsData.filter(s => s.mentor && s.mentor.includes(mentor.shortName || mentor.name) && s.date && isWeekday(s.date) === true && !s.booked && times.includes(s.hour)).length;
      // fallback: use length from defined schedule when Firestore data not present
      availableByDay[day] = count || times.length;
    });

    const mentorCard = document.createElement("div");
    mentorCard.className = "mentor-card-large";
    // build schedule HTML
    let scheduleHTML = "";
    Object.keys(mentor.schedule).forEach(day => {
      const times = mentor.schedule[day];
      scheduleHTML += `<div class=\"mentor-day-schedule\"><div class=\"mentor-day-name\">${day}</div><div class=\"mentor-times\">`;
      times.forEach(t => {
        scheduleHTML += `<span class=\"time-badge\">${t}</span>`;
      });
      scheduleHTML += `</div><div class=\"mentor-day-count\">${availableByDay[day]} disponíveis</div></div>`;
    });

    const filename = normalizeFileName(mentor.shortName || mentor.name) + '.jpeg';
    mentorCard.innerHTML = `
      <div class="mentor-avatar">
        <img class="mentor-avatar-img" src="imagens/${filename}" alt="Foto de ${mentor.name}" onerror="if (this.src.endsWith('.jpeg')){this.src=this.src.replace(/\.jpeg$/, '.jpg');} else {this.style.display='none'; this.parentNode.querySelector('.avatar-fallback').style.display='flex';}" />
        <div class="avatar-fallback"><i class="bi ${mentor.icon}"></i></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;width:100%;">
        <h3 class="mentor-card-name">${mentor.name}</h3>
        <p class="mentor-description">${mentor.description}</p>
        <button class="outline-btn" type="button" onclick="openMentorScheduleModal('${mentor.shortName || mentor.name}')">Ver horários</button>
      </div>
    `;
    mentoresContainer.appendChild(mentorCard);
  });
}

// Menu navigation
document.querySelectorAll(".sidebar-item").forEach((item) => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".sidebar-item").forEach(i => i.classList.remove("active"));
    item.classList.add("active");
    
    const page = item.getAttribute("data-page");
    showPage(page);
  });
});