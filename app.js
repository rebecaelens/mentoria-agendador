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
  addDoc,
  query,
  orderBy,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  createLog
} from "./logs.js";

function formatBrazilianDate(dateString) {

  const date = new Date(dateString);

  return date.toLocaleDateString("pt-BR");
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
    alert(error.message);
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
  });
}

function renderSlots() {

  slotsContainer.innerHTML = "";

  const currentUser = auth.currentUser;

  slotsData.forEach((slot) => {

    const row = document.createElement("tr");

    let statusHTML = "";


    // ============================================
    // SLOT DISPONÍVEL
    // ============================================

    if (!slot.booked) {

      statusHTML = `
        <div class="d-flex flex-column gap-2 align-items-center">

          <span class="badge text-bg-success">
            Disponível
          </span>

          <button
            class="btn btn-success btn-sm"
            onclick="bookSlot('${slot.id}')"
          >
            Agendar
          </button>
        </div>
      `;
    }


    // ============================================
    // SLOT DO USUÁRIO LOGADO
    // ============================================

    else if (
      currentUser &&
      slot.studentId === currentUser.uid
    ) {

      statusHTML = `
        <div class="d-flex flex-column gap-2 align-items-center">

          <span class="badge text-bg-primary">
            Agendado por você
          </span>

          <button
            class="btn btn-outline-danger btn-sm"
            onclick="unbookSlot('${slot.id}')"
          >
            Desmarcar
          </button>
        </div>
      `;
    }


    // ============================================
    // SLOT DE OUTRO ALUNO
    // ============================================

    else {

      statusHTML = `
        <div class="d-flex flex-column gap-2 align-items-center">

          <button
            class="btn btn-warning btn-sm"
            disabled
          >
            Agendado: ${slot.studentName}
          </button>
        </div>
      `;
    }

    row.innerHTML = `
      <td>${formatBrazilianDate(slot.date)}</td>

      <td>${slot.hour}</td>

      <td>${slot.mentor}</td>

      <td>${statusHTML}</td>
    `;

    slotsContainer.appendChild(row);
  });
}

// ============================================
// BOOK SLOT
// ============================================

window.bookSlot = async (slotId) => {

  const user = auth.currentUser;

  if (!user) {
    alert("Faça login primeiro");
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

    alert(
      "Você só pode desmarcar horários reservados por você"
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



