// src/usePaystack.js
import { useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

// USD pricing — Paystack supports USD
export const PLANS = {
  pro: {
    name:        "Pro",
    priceUSD:    12,
    currency:    "USD",
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
    priceUSD:    22,
    currency:    "USD",
    description: "Everything in Pro + AI trade analysis, multi-account, weekly email reports",
    features: [
      "Everything in Pro",
      "AI trade feedback",
      "Multi-account tracking",
      "Weekly performance email",
      "Priority support",
    ],
  },
};

function loadPaystackScript() {
  return new Promise((resolve) => {
    if (window.PaystackPop) { resolve(); return; }
    const script   = document.createElement("script");
    script.src     = "https://js.paystack.co/v1/inline.js";
    script.onload  = resolve;
    document.head.appendChild(script);
  });
}

async function upgradeTier(uid, tier, paystackRef) {
  const now      = new Date();
  const oneMonth = new Date(now.setMonth(now.getMonth() + 1));
  await updateDoc(doc(db, "users", uid), {
    tier,
    paystackRef,
    subscriptionEnd: oneMonth.toISOString(),
  });
}

export function usePaystack() {
  const { user, refreshProfile } = useAuth();

  useEffect(() => { loadPaystackScript(); }, []);

  const initPayment = async (planKey) => {
    if (!user) return;
    await loadPaystackScript();

    const plan   = PLANS[planKey];
    const amount = plan.priceUSD * 100; // Paystack uses cents

    const handler = window.PaystackPop.setup({
      key:      import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email:    user.email,
      amount,
      currency: "USD",
      ref:      `TRADELOG-${user.uid}-${Date.now()}`,
      metadata: {
        custom_fields: [
          { display_name: "User ID", variable_name: "uid",  value: user.uid  },
          { display_name: "Plan",    variable_name: "plan", value: planKey   },
        ],
      },
      callback: async (response) => {
        if (response.status === "success") {
          await upgradeTier(user.uid, planKey, response.reference);
          await refreshProfile();
        }
      },
      onClose: () => {},
    });

    handler.openIframe();
  };

  return { initPayment, PLANS };
}

export function useFeatureGate() {
  const { isPro, isElite, isFree, profile } = useAuth();

  return (feature) => {
    switch (feature) {
      case "journal_basic": return true;
      case "calculator":    return true;
      case "calendar":      return true;
      case "trade_log": {
        if (isPro || isElite) return true;
        return (profile?.tradeCount || 0) < 20;
      }
      case "analytics":        return isPro || isElite;
      case "heatmap":          return isPro || isElite;
      case "csv_export":       return isPro || isElite;
      case "screenshots":      return isPro || isElite;
      case "unlimited_trades": return isPro || isElite;
      case "ai_feedback":      return isElite;
      case "multi_account":    return isElite;
      case "email_reports":    return isElite;
      default: return false;
    }
  };
}
