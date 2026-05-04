// src/tradesService.js
// All Firestore reads/writes for trades live here.
// Collection path: users/{uid}/trades/{tradeId}

import {
  collection, doc,
  addDoc, setDoc, deleteDoc,
  getDocs, query, orderBy,
  serverTimestamp, updateDoc, increment,
} from "firebase/firestore";
import { db } from "./firebase";

const tradesCol = (uid) => collection(db, "users", uid, "trades");
const userDoc   = (uid) => doc(db, "users", uid);

// ── Fetch all trades for a user ──────────────────────────────
export async function fetchTrades(uid) {
  const q    = query(tradesCol(uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Add a new trade ──────────────────────────────────────────
export async function addTrade(uid, trade) {
  const ref = await addDoc(tradesCol(uid), {
    ...trade,
    createdAt: serverTimestamp(),
  });
  // Increment user's total trade count
  await updateDoc(userDoc(uid), { tradeCount: increment(1) });
  return ref.id;
}

// ── Update an existing trade ─────────────────────────────────
export async function updateTrade(uid, tradeId, trade) {
  const ref = doc(db, "users", uid, "trades", tradeId);
  await setDoc(ref, { ...trade, updatedAt: serverTimestamp() }, { merge: true });
}

// ── Delete a trade ───────────────────────────────────────────
export async function deleteTrade(uid, tradeId) {
  await deleteDoc(doc(db, "users", uid, "trades", tradeId));
  await updateDoc(userDoc(uid), { tradeCount: increment(-1) });
}

// ── Count today's trades ──────────────────────────────────────
export function countTodayTrades(trades) {
  const today = new Date().toISOString().slice(0, 10);
  return trades.filter(t => t.date === today).length;
}

