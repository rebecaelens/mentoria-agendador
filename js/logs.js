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

