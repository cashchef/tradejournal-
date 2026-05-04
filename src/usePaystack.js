// src/usePaystack.js
// Handles Paystack inline payment + subscription tier upgrade
// Paystack docs: https://paystack.com/docs/payments/accept-payments

import { useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

// Pricing in KES (Kenyan Shillings) — 100 kobo = 1 NGN, 100 cents = 1 KES
// Paystack Kenya uses KES, Nigeria uses NGN
export const PLANS = {
  pro: {
    name:        "Pro",
    priceKES:    1500,      // KES 1,500/month ≈ $11.50
    priceUSD:    12,
    currency:    "KES",
    description: "Unlimited trades, full analytics, heatmap, CSV export, screenshots",
    features: [
      "Unlimited trade logs",
      "Full analytics dashboard",
      "Monthly P&L heatmap",
      "Chart screenshot uploads",
      "CSV export",
      "Setup & mood tracking",
      "Risk calculator",
    ],
  },
  elite: {
    name:        "Elite",
    priceKES:    2800,      // KES 2,800/month ≈ $21.50
    priceUSD:    22,
    currency:    "KES",
    description: "Everything in Pro + AI trade analysis, multi-account, weekly email reports",
    features: [
      "Everything in Pro",
      "AI trade feedback (Claude)",
      "Multi-account tracking",
      "Weekly performance email",
      "Priority support",
    ],
  },
};

// Load Paystack script once
function loadPaystackScript() {
  return new Promise((resolve) => {
    if (window.PaystackPop) { resolve(); return; }
    const script   = document.createElement("script");
    script.src     = "https://js.paystack.co/v1/inline.js";
    script.onload  = resolve;
    document.head.appendChild(script);
  });
}

// ── Upgrade user tier in Firestore after payment ─────────────
async function upgradeTier(uid, tier, paystackRef) {
  const now       = new Date();
  const oneMonth  = new Date(now.setMonth(now.getMonth() + 1));
  await updateDoc(doc(db, "users", uid), {
    tier,
    paystackRef,
    subscriptionEnd: oneMonth.toISOString(),
  });
}

// ── Main hook ─────────────────────────────────────────────────
export function usePaystack() {
  const { user, refreshProfile } = useAuth();

  useEffect(() => { loadPaystackScript(); }, []);

  const initPayment = async (planKey) => {
    if (!user) return;
    await loadPaystackScript();

    const plan   = PLANS[planKey];
    const amount = plan.priceKES * 100; // Paystack uses smallest currency unit

    const handler = window.PaystackPop.setup({
      key:       import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email:     user.email,
      amount,
      currency:  plan.currency,
      ref:       `TRADELOG-${user.uid}-${Date.now()}`,
      metadata: {
        custom_fields: [
          { display_name: "User ID",   variable_name: "uid",  value: user.uid },
          { display_name: "Plan",      variable_name: "plan", value: planKey  },
        ],
      },
      callback: async (response) => {
        // Payment successful — upgrade tier in Firestore
        // In production: verify the reference server-side via a Cloud Function
        // before trusting it. For MVP, client-side upgrade is acceptable.
        if (response.status === "success") {
          await upgradeTier(user.uid, planKey, response.reference);
          await refreshProfile();
        }
      },
      onClose: () => {
        // User closed payment modal without completing
        console.log("Payment modal closed");
      },
    });

    handler.openIframe();
  };

  return { initPayment, PLANS };
}

// ── Feature gate helper ───────────────────────────────────────
// Usage: const can = useFeatureGate();  if (!can("analytics")) return <UpgradePrompt/>
export function useFeatureGate() {
  const { isPro, isElite, isFree, profile } = useAuth();

  return (feature) => {
    switch (feature) {
      // Free features
      case "journal_basic":    return true;
      case "calculator":       return true;
      case "calendar":         return true;

      // Free but limited
      case "trade_log": {
        // Free: 20 trades/month cap
        if (isPro || isElite) return true;
        const count = profile?.tradeCount || 0;
        return count < 20;
      }

      // Pro+ features
      case "analytics":        return isPro || isElite;
      case "heatmap":          return isPro || isElite;
      case "csv_export":       return isPro || isElite;
      case "screenshots":      return isPro || isElite;
      case "unlimited_trades": return isPro || isElite;

      // Elite only
      case "ai_feedback":      return isElite;
      case "multi_account":    return isElite;
      case "email_reports":    return isElite;

      default: return false;
    }
  };
}

