// seed.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc
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


// ============================================
// INIT
// ============================================

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// ============================================
// CONFIGURAÇÃO
// ============================================

const mentors = [
  "André",
  "Manuel",
  "Matheus",
];

const hours = [
  "09:00",
  "10:00",
  "11:00",
  "14:00",
  "15:00",
  "16:00"
];


// ============================================
// RANGE DE DATAS
// ============================================

const startDate = new Date("2026-06-01");
const endDate = new Date("2026-06-30");


// ============================================
// HELPERS
// ============================================

function formatDate(date) {

  return date.toISOString().split("T")[0];
}


// ============================================
// CREATE SLOTS
// ============================================

async function createSlots() {

  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {

    const formattedDate = formatDate(currentDate);

    for (const mentor of mentors) {

      for (const hour of hours) {

        const slot = {
          date: formattedDate,
          hour,
          mentor,
          booked: false,
          studentId: null,
          studentName: null
        };

        await addDoc(
          collection(db, "slots"),
          slot
        );

        console.log(
          `Criado: ${formattedDate} ${hour} ${mentor}`
        );
      }
    }

    currentDate.setDate(
      currentDate.getDate() + 1
    );
  }

  console.log("Todos os horários foram criados");
}


// ============================================
// EXECUTE
// ============================================

createSlots();
