import { getSupabaseClient, hasSupabaseConfig } from "/site/supabaseClient.js";

const REDIRECT_URL = "https://pricingplus.app/login/callback";

const copy = {
  ar: {
    title: "تسجيل الدخول",
    body: "أدخل بريدك الإلكتروني وسنرسل لك رابط دخول آمن.",
    email: "البريد الإلكتروني",
    placeholder: "name@example.com",
    submit: "إرسال رابط الدخول",
    checking: "جارٍ الإرسال...",
    success: "تم إرسال الرابط. تحقّق من بريدك الإلكتروني.",
    failed: "تعذر إرسال الرابط حالياً. حاول مرة أخرى.",
    missingConfig: "تسجيل الدخول غير مفعّل حالياً (إعداد Supabase غير مكتمل).",
    invalidEmail: "يرجى إدخال بريد إلكتروني صحيح."
  },
  en: {
    title: "Sign in",
    body: "Enter your email and we will send a secure magic link.",
    email: "Email",
    placeholder: "name@example.com",
    submit: "Send login link",
    checking: "Sending...",
    success: "Magic link sent. Check your inbox.",
    failed: "Could not send the link right now. Please try again.",
    missingConfig: "Login is not enabled yet (Supabase config is missing).",
    invalidEmail: "Please enter a valid email address."
  }
};

function getLocale() {
  return localStorage.getItem("pricingplus_locale") === "ar" ? "ar" : "en";
}

function t(locale, key) {
  return copy[locale][key] || copy.en[key] || "";
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

document.addEventListener("DOMContentLoaded", async () => {
  const locale = getLocale();
  const title = document.getElementById("loginMagicTitle");
  const body = document.getElementById("loginMagicBody");
  const emailLabel = document.getElementById("loginEmailLabel");
  const emailInput = document.getElementById("loginEmail");
  const submitBtn = document.getElementById("sendMagicLinkBtn");
  const status = document.getElementById("loginMagicStatus");
  const form = document.getElementById("loginMagicForm");

  if (!form || !emailInput || !submitBtn || !status) return;

  if (title) title.textContent = t(locale, "title");
  if (body) body.textContent = t(locale, "body");
  if (emailLabel) emailLabel.textContent = t(locale, "email");
  emailInput.placeholder = t(locale, "placeholder");
  submitBtn.textContent = t(locale, "submit");

  const supabase = await getSupabaseClient();
  if (!hasSupabaseConfig() || !supabase) {
    status.textContent = t(locale, "missingConfig");
    status.className = "warn-note";
    submitBtn.disabled = true;
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();

    if (!isValidEmail(email)) {
      status.textContent = t(locale, "invalidEmail");
      status.className = "warn-note";
      return;
    }

    status.textContent = t(locale, "checking");
    status.className = "muted";
    submitBtn.disabled = true;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: REDIRECT_URL }
    });

    submitBtn.disabled = false;

    if (error) {
      status.textContent = t(locale, "failed");
      status.className = "warn-note";
      return;
    }

    status.textContent = t(locale, "success");
    status.className = "ok-note";
    form.reset();
  });
});
