# Agendador de Mentoria

## Estrutura

```txt
/project
  index.html
  style.css
  app.js
  logs.js
```

---

# index.html

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>Agendador de Mentoria</title>

  <link
    href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
    rel="stylesheet"
  />

  <link rel="stylesheet" href="style.css" />
</head>
<body>

  <div class="container py-5">

    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="fw-bold">Agendador de Mentoria</h1>
        <p class="text-muted mb-0">
          Escolha um horário disponível
        </p>
      </div>

      <div class="d-flex align-items-center gap-3">
        <span id="user-name"></span>

        <button
          id="login-btn"
          class="btn btn-primary"
        >
          Login Google
        </button>

        <button
          id="logout-btn"
          class="btn btn-outline-danger d-none"
        >
          Sair
        </button>
      </div>
    </div>

    <div class="card shadow-sm">
      <div class="card-body">
        <div class="table-responsive">
          <table class="table table-bordered align-middle text-center">
            <thead class="table-dark">
              <tr>
                <th>Data</th>
                <th>Horário</th>
                <th>Mentor</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody id="slots-container"></tbody>
          </table>
        </div>
      </div>
    </div>

  </div>

  <script type="module" src="app.js"></script>
</body>
</html>
```

---

# style.css

```css
body {
  background-color: #f5f5f5;
}

.slot-card {
  transition: 0.2s ease;
}

.slot-card:hover {
  transform: translateY(-4px);
}
```

---

# logs.js

```javascript
import {
  getFirestore,
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


export async function createLog(app, data) {

  const db = getFirestore(app);

  await addDoc(collection(db, "logs"), {
    ...data,
    createdAt: new Date().toISOString()
  });
}
```

---

# app.js

````javascript
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
  getDocs,
  doc,
  updateDoc,
  addDoc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  createLog
} from "./logs.js";

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_AUTH_DOMAIN",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_STORAGE_BUCKET",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID"
};

const ASCENDING_ORDER = true;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userName = document.getElementById("user-name");
const slotsContainer = document.getElementById("slots-container");

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

onAuthStateChanged(auth, async (user) => {

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

  await loadSlots();
});

async function loadSlots() {

  slotsContainer.innerHTML = "";

  const slotsQuery = query(
    collection(db, "slots"),
    orderBy("dateOrder", ASCENDING_ORDER ? "asc" : "desc")
  );

  const querySnapshot = await getDocs(slotsQuery);

  querySnapshot.forEach((slotDoc) => {

    const slot = slotDoc.data();
    const id = slotDoc.id;

    const currentUser = auth.currentUser;

    const row = document.createElement("tr");

    let statusHTML = "";

    if (!slot.booked) {

      statusHTML = `
        <div class="d-flex flex-column gap-2 align-items-center">

          <span class="badge text-bg-success">
            Disponível
          </span>

          <button
            class="btn btn-success btn-sm"
            onclick="bookSlot('${id}')"
          >
            Agendar
          </button>
        </div>
      `;
    }

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
            onclick="unbookSlot('${id}')"
          >
            Desmarcar
          </button>
        </div>
      `;
    }

    else {

      statusHTML = `
        <div class="d-flex flex-column gap-2 align-items-center">

          <span class="badge text-bg-danger">
            Já agendado
          </span>

          <button
            class="btn btn-danger btn-sm"
            disabled
          >
            Indisponível
          </button>
        </div>
      `;
    }


    row.innerHTML = `
      <td>${slot.date}</td>

      <td>${slot.hour}</td>

      <td>${slot.mentor}</td>

      <td>${statusHTML}</td>
    `;

    slotsContainer.appendChild(row);
  });
}

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

  await createLog({
    action: "BOOK_SLOT",
    slotId,
    userId: user.uid,
    userName: user.displayName
  });

  await loadSlots();
};

window.unbookSlot = async (slotId) => {

  const user = auth.currentUser;

  if (!user) {
    return;
  }

  const slotsSnapshot = await getDocs(collection(db, "slots"));

  let targetSlot = null;

  slotsSnapshot.forEach((slotDoc) => {

    if (slotDoc.id === slotId) {
      targetSlot = {
        id: slotDoc.id,
        ...slotDoc.data()
      };
    }
  });

  if (!targetSlot) {
    return;
  }

  if (targetSlot.studentId !== user.uid) {
    alert("Você só pode desmarcar horários reservados por você");
    return;
  }

  const slotRef = doc(db, "slots", slotId);

  await updateDoc(slotRef, {
    booked: false,
    studentId: null,
    studentName: null
  });

  await createLog({
    action: "UNBOOK_SLOT",
    slotId,
    userId: user.uid,
    userName: user.displayName
  });

  await loadSlots();
};


);
}

// EXECUTE UMA VEZ E DEPOIS COMENTE

async function createInitialSlots() {

  const slots = [
    {
      date: "01/06/2026",
      dateOrder: 20260601,
      hour: "14:00",
      mentor: "Carlos",
      booked: false
    },
    {
      date: "01/06/2026",
      dateOrder: 20260601,
      hour: "15:00",
      mentor: "Fernanda",
      booked: false
    },
    {
      date: "02/06/2026",
      dateOrder: 20260602,
      hour: "13:00",
      mentor: "Ricardo",
      booked: false
    },
    {
      date: "03/06/2026",
      dateOrder: 20260603,
      hour: "16:00",
      mentor: "Juliana",
      booked: false
    }
  ];

  for (const slot of slots) {
    await addDoc(collection(db, "slots"), slot);
  }

  console.log("Slots criados");
}


// DESCOMENTE PARA POPULAR O BANCO
// createInitialSlots();
```javascript
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
  getDocs,
  doc,
  updateDoc,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_AUTH_DOMAIN",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_STORAGE_BUCKET",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userName = document.getElementById("user-name");
const slotsContainer = document.getElementById("slots-container");

const provider = new GoogleAuthProvider();

loginBtn.addEventListener("click", async () => {
  await signInWithPopup(auth, provider);
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {

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

  await loadSlots();
});

async function loadSlots() {

  slotsContainer.innerHTML = "";

  const querySnapshot = await getDocs(collection(db, "slots"));

  querySnapshot.forEach((slotDoc) => {

    const slot = slotDoc.data();
    const id = slotDoc.id;

    const row = document.createElement("tr");


    let statusHTML = "";

    if (!slot.booked) {

      statusHTML = `
        <button
          class="btn btn-success btn-sm"
          onclick="bookSlot('${id}')"
        >
          Agendar
        </button>
      `;
    }

    else {

      statusHTML = `
        <button
          class="btn btn-danger btn-sm"
          disabled
        >
          Ocupado
        </button>
      `;
    }


    row.innerHTML = `
      <td>${slot.date}</td>

      <td>${slot.hour}</td>

      <td>${slot.mentor}</td>

      <td>${statusHTML}</td>
    `;

    slotsContainer.appendChild(row);
  });
}

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

  await loadSlots();
};

// EXECUTE UMA VEZ E DEPOIS COMENTE

async function createInitialSlots() {

  const slots = [
    {
      date: "01/06/2026",
      hour: "14:00",
      mentor: "Carlos",
      booked: false
    },
    {
      date: "01/06/2026",
      hour: "15:00",
      mentor: "Fernanda",
      booked: false
    },
    {
      date: "02/06/2026",
      hour: "13:00",
      mentor: "Ricardo",
      booked: false
    },
    {
      date: "03/06/2026",
      hour: "16:00",
      mentor: "Juliana"
      booked: false
    }
  ];

  for (const slot of slots) {
    await addDoc(collection(db, "slots"), slot);
  }

  console.log("Slots criados");
}

````

---

# COMO CONFIGURAR

## 1. Criar projeto Firebase

Acesse:

[https://console.firebase.google.com/](https://console.firebase.google.com/)

---

## 2. Criar app Web

Clique em:

```txt
Adicionar App → Web
```

Copie as credenciais.

Substitua no app.js:

```js
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_AUTH_DOMAIN",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_STORAGE_BUCKET",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID"
};
```

---

# 3. Ativar login Google

Authentication → Sign-in method → Google → Enable

---

# 4. Criar Firestore Database

Firestore Database → Create database

Modo:

```txt
Test mode
```

---

# 5. Regras temporárias do Firestore

Firestore → Rules

```txt
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

---

# 6. Popular horários

No app.js:

```js
// createInitialSlots();
```

remova o comentário:

```js
createInitialSlots();
```

Abra o projeto uma vez.

Depois comente novamente.

---

# 7. Rodar localmente

Você pode usar:

```bash
python -m http.server 5500
```

ou:

```bash
npx serve
```

---

# Resultado

O sistema terá:

* Login Google
* Horários
* Mentores
* Agendamento
* Atualização no Firestore
* Bootstrap
* JS puro
* Sem backend
* Sem SQL

