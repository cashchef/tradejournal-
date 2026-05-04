// src/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);   // Firebase user object
  const [profile, setProfile] = useState(null);   // Firestore user doc { tier, paystackRef, ... }
  const [loading, setLoading] = useState(true);

  // Load or create Firestore profile when auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const ref  = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setProfile(snap.data());
        } else {
          // First login — create free-tier profile
          const newProfile = {
            uid:         firebaseUser.uid,
            email:       firebaseUser.email,
            displayName: firebaseUser.displayName || "",
            tier:        "free",           // "free" | "pro" | "elite"
            tradeCount:  0,
            dailyLimit:  3,
            createdAt:   serverTimestamp(),
            paystackRef: null,
            subscriptionEnd: null,
          };
          await setDoc(ref, newProfile);
          setProfile(newProfile);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Refresh profile from Firestore (call after payment confirmed)
  const refreshProfile = async () => {
    if (!user) return;
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) setProfile(snap.data());
  };

  const loginWithGoogle = () => signInWithPopup(auth, googleProvider);

  const loginWithEmail = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const registerWithEmail = async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    return cred;
  };

  const logout = () => signOut(auth);

  // Tier helpers
  const isPro   = profile?.tier === "pro"   || profile?.tier === "elite";
  const isElite = profile?.tier === "elite";
  const isFree  = profile?.tier === "free" || !profile?.tier;

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      loginWithGoogle, loginWithEmail, registerWithEmail, logout,
      refreshProfile, isPro, isElite, isFree,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

