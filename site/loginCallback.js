// Global error tracking for resilience
if (!window.__pricingPlusErrorsBound) {
  window.__pricingPlusErrorsBound = true;
  window.addEventListener('unhandledrejection', (event) => {
    // TODO: Integrate with monitoring service like Sentry
    console.error("Unhandled Promise Rejection:", event.reason);
  });

  window.addEventListener('error', (event) => {
    // TODO: Integrate with monitoring service like Sentry
    console.error("Global Runtime Error:", event.error || event.message);
  });
}

import { getSupabaseClient, hasSupabaseConfig } from "/site/supabaseClient.js";

const copy = {
  ar: {
    loading: "جارٍ إكمال تسجيل الدخول...",
    success: "تم تسجيل الدخول. سيتم تحويلك إلى الأداة.",
    failed: "تعذر إكمال تسجيل الدخول من الرابط الحالي.",
    missingConfig: "تسجيل الدخول غير مفعّل حالياً.",
    back: "العودة إلى صفحة تسجيل الدخول"
  },
  en: {
    loading: "Completing sign-in...",
    success: "Signed in successfully. Redirecting to the app.",
    failed: "Could not complete sign-in from this link.",
    missingConfig: "Login is not enabled yet.",
    back: "Back to login"
  }
};

function getLocale() {
  const saved =
    localStorage.getItem("selectedLanguage") ||
    localStorage.getItem("pricingplus_locale") ||
    navigator.language;
  return String(saved).toLowerCase().startsWith("en") ? "en" : "ar";
}

function t(locale, key) {
  return copy[locale][key] || copy.en[key] || "";
}

async function waitForSession(supabase) {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;

  return new Promise((resolve) => {
    let done = false;
    const timeout = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(null);
      }
    }, 4000);

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (done) return;
      if (!session) return;
      done = true;
      clearTimeout(timeout);
      sub.subscription.unsubscribe();
      resolve(session);
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const locale = getLocale();
  const status = document.getElementById("loginCallbackStatus");
  const backBtn = document.getElementById("loginCallbackBack");

  if (!status) return;
  status.textContent = t(locale, "loading");
  if (backBtn) backBtn.textContent = t(locale, "back");

  if (!hasSupabaseConfig()) {
    status.textContent = t(locale, "missingConfig");
    status.className = "warn-note";
    return;
  }

  const supabase = await getSupabaseClient();
  if (!supabase) {
    status.textContent = t(locale, "missingConfig");
    status.className = "warn-note";
    return;
  }

  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  if (code) {
    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch (error) {
      console.error("Auth Exchange Error:", error);
      alert(locale === "ar" ? "الرابط قد انتهت صلاحيته أو غير صالح" : "The link has expired or is invalid.");
      window.location.replace("/login/");
      return;
    }
  }

  const session = await waitForSession(supabase);

  if (!session) {
    status.textContent = t(locale, "failed");
    status.className = "warn-note";
    return;
  }

  status.textContent = t(locale, "success");
  status.className = "ok-note";
  setTimeout(() => {
    window.location.replace("/app/");
  }, 400);
});
