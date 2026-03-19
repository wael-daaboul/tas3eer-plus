import { getSupabaseClient, hasSupabaseConfig } from "/site/supabaseClient.js";

const REDIRECT_URL = "https://pricingplus.app/login/callback";
const COOLDOWN_SECONDS = 15;
const RATE_LIMIT_COUNT = 3;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_KEY = "pricingplus_login_send_timestamps";
const PENALTY_KEY = "pricingplus_login_penalty";

const copy = {
  ar: {
    title: "تسجيل الدخول",
    body: "أدخل بريدك الإلكتروني وسنرسل لك رابط دخول آمن.",
    optionalNote: "تسجيل الدخول اختياري. استخدمه للمزامنة وحماية بياناتك.",
    email: "البريد الإلكتروني",
    placeholder: "name@example.com",
    submit: "إرسال رابط الدخول",
    sending: "جارٍ الإرسال...",
    resend: "إعادة إرسال الرابط",
    resendIn: "إعادة الإرسال خلال {s} ثانية",
    success: "تم إرسال رابط الدخول. افتح بريدك واضغط الرابط.",
    failed: "تعذر إرسال الرابط حالياً. حاول مرة أخرى.",
    missingConfig: "تسجيل الدخول غير متاح مؤقتًا. حاول لاحقًا.",
    invalidEmail: "يرجى إدخال بريد إلكتروني صحيح.",
    spamNote: "إذا لم تجد الرسالة، افحص مجلد البريد العشوائي (Spam/Junk).",
    rateLimit: "تم الوصول للحد المؤقت. حاول بعد {m} دقيقة.",
    rateLimitShort: "تم الوصول للحد المؤقت. حاول لاحقًا."
  },
  en: {
    title: "Sign in",
    body: "Enter your email and we will send a secure magic link.",
    optionalNote: "Sign-in is optional. Use it to sync and protect your data.",
    email: "Email",
    placeholder: "name@example.com",
    submit: "Send login link",
    sending: "Sending...",
    resend: "Resend link",
    resendIn: "Resend in {s}s",
    success: "We sent a sign-in link. Open your email and click it.",
    failed: "Could not send the link right now. Please try again.",
    missingConfig: "Login is temporarily unavailable. Please try again later.",
    invalidEmail: "Please enter a valid email address.",
    spamNote: "If you do not see the email, check Spam/Junk folder.",
    rateLimit: "Too many attempts. Try again in {m} minute(s).",
    rateLimitShort: "Too many attempts. Please try later."
  }
};

function getLocale() {
  const saved =
    localStorage.getItem("selectedLanguage") ||
    localStorage.getItem("pricingplus_locale") ||
    navigator.language;
  return String(saved).toLowerCase().startsWith("en") ? "en" : "ar";
}

function t(locale, key, vars = {}) {
  const msg = copy[locale][key] || copy.en[key] || "";
  return msg.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function getStoredTimestamps() {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr)) return [];
    return arr.filter((n) => Number.isFinite(n) && n > 0 && n <= Date.now());
  } catch {
    return [];
  }
}

function writeStoredTimestamps(values) {
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(values));
}

function pruneOldTimestamps(values) {
  const now = Date.now();
  return values.filter((ts) => now - ts <= RATE_LIMIT_WINDOW_MS);
}

document.addEventListener("DOMContentLoaded", async () => {
  const locale = getLocale();
  const logo = document.getElementById("loginCardLogo");
  const title = document.getElementById("loginMagicTitle");
  const body = document.getElementById("loginMagicBody");
  const optionalNote = document.getElementById("loginOptionalNote");
  const emailLabel = document.getElementById("loginEmailLabel");
  const emailInput = document.getElementById("loginEmail");
  const emailError = document.getElementById("loginEmailError");
  const submitBtn = document.getElementById("sendMagicLinkBtn");
  const resendBtn = document.getElementById("resendMagicLinkBtn");
  const spamNote = document.getElementById("loginSpamNote");
  const successBox = document.getElementById("loginSuccessBox");
  const successText = document.getElementById("loginSuccessText");
  const status = document.getElementById("loginMagicStatus");
  const form = document.getElementById("loginMagicForm");

  if (!form || !emailInput || !submitBtn || !status || !emailError || !successBox || !successText || !resendBtn || !spamNote) return;

  if (logo) {
    const isArabic = locale === "ar";
    logo.src = isArabic ? "/assets/brand/logo-ar.svg" : "/assets/brand/logo-en.svg";
    logo.alt = "Pricing+";
  }

  if (title) title.textContent = t(locale, "title");
  if (body) body.textContent = t(locale, "body");
  if (optionalNote) optionalNote.textContent = t(locale, "optionalNote");
  if (emailLabel) emailLabel.textContent = t(locale, "email");
  if (spamNote) spamNote.textContent = t(locale, "spamNote");
  emailInput.placeholder = t(locale, "placeholder");
  submitBtn.textContent = t(locale, "submit");
  resendBtn.textContent = t(locale, "resend");

  let isSubmitting = false;
  let cooldownUntil = 0;
  let cooldownTimer = null;
  let lastSentEmail = "";

  function getRateLimitState() {
    const validTimestamps = pruneOldTimestamps(getStoredTimestamps());
    writeStoredTimestamps(validTimestamps);

    let penaltyMs = 0;
    try {
      const p = Number(localStorage.getItem(PENALTY_KEY));
      if (Number.isFinite(p) && p > Date.now()) {
        penaltyMs = p - Date.now();
      }
    } catch { }

    if (validTimestamps.length < RATE_LIMIT_COUNT && penaltyMs <= 0) {
      return { blocked: false, remainingMs: 0 };
    }

    const oldest = validTimestamps[0] || Date.now();
    const windowRemaining = Math.max(0, RATE_LIMIT_WINDOW_MS - (Date.now() - oldest));
    const remainingMs = Math.max(windowRemaining, penaltyMs);

    return { blocked: remainingMs > 0, remainingMs };
  }

  function setError(message) {
    if (!message) {
      emailError.textContent = "";
      emailError.classList.add("hidden");
      return;
    }
    emailError.textContent = message;
    emailError.classList.remove("hidden");
  }

  function setStatus(message, kind = "muted") {
    status.textContent = message;
    status.className = `login-status ${kind}`;
  }

  function setSuccessVisible(visible) {
    successBox.classList.toggle("hidden", !visible);
  }

  function updateCooldownButton() {
    const now = Date.now();
    const remainingSec = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
    if (remainingSec > 0) {
      resendBtn.disabled = true;
      resendBtn.textContent = t(locale, "resendIn", { s: remainingSec });
      return;
    }
    resendBtn.disabled = false;
    resendBtn.textContent = t(locale, "resend");
  }

  function startCooldown() {
    cooldownUntil = Date.now() + (COOLDOWN_SECONDS * 1000);
    updateCooldownButton();

    if (cooldownTimer) {
      clearTimeout(cooldownTimer);
    }

    const tick = () => {
      updateCooldownButton();
      if (Date.now() < cooldownUntil) {
        cooldownTimer = setTimeout(tick, 1000);
      } else {
        cooldownTimer = null;
        renderSubmitState();
      }
    };

    cooldownTimer = setTimeout(tick, 1000);
  }

  function renderSubmitState() {
    const email = emailInput.value.trim();
    const isEmailValid = isValidEmail(email);
    const rate = getRateLimitState();
    const cooldownActive = Date.now() < cooldownUntil;
    const blocked = rate.blocked;

    if (!email) {
      setError("");
    } else if (!isEmailValid) {
      setError(t(locale, "invalidEmail"));
    } else {
      setError("");
    }

    if (blocked) {
      const minutes = Math.max(1, Math.ceil(rate.remainingMs / 60000));
      setStatus(t(locale, "rateLimit", { m: minutes }), "warn-note");
    }

    submitBtn.disabled = isSubmitting || !isEmailValid || cooldownActive || blocked;
  }

  function markSendAttempt() {
    const next = pruneOldTimestamps(getStoredTimestamps());
    next.push(Date.now());
    writeStoredTimestamps(next);

    // Exponential backoff context + jitter
    if (next.length >= RATE_LIMIT_COUNT) {
      const basePenalty = 15 * 60 * 1000; // 15 mins
      const jitter = Math.floor(Math.random() * 60000); // Up to 1 min jitter
      const penaltyUntil = Date.now() + basePenalty + jitter;
      localStorage.setItem(PENALTY_KEY, penaltyUntil.toString());
    }
  }

  async function sendMagicLink(email) {
    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = t(locale, "sending");
    setStatus(t(locale, "sending"), "muted");

    try {
      const supabase = await getSupabaseClient();
      if (!hasSupabaseConfig() || !supabase) {
        setStatus(t(locale, "missingConfig"), "warn-note");
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: REDIRECT_URL }
      });

      if (error) {
        setStatus(t(locale, "failed"), "warn-note");
        return;
      }

      markSendAttempt();
      lastSentEmail = email;
      setSuccessVisible(true);
      successText.textContent = t(locale, "success");
      setStatus("");
      startCooldown();
      form.reset();
      setError("");
    } finally {
      isSubmitting = false;
      submitBtn.textContent = t(locale, "submit");
      renderSubmitState();
    }
  }

  const hasConfig = hasSupabaseConfig();
  if (!hasConfig) {
    setStatus(t(locale, "missingConfig"), "warn-note");
    submitBtn.disabled = true;
    resendBtn.disabled = true;
    return;
  }

  setSuccessVisible(false);
  setStatus("");
  renderSubmitState();

  emailInput.addEventListener("input", () => {
    const cleaned = emailInput.value.replace(/\s+/g, " ");
    if (cleaned !== emailInput.value) {
      emailInput.value = cleaned;
    }
    renderSubmitState();
  });

  emailInput.addEventListener("blur", () => {
    emailInput.value = emailInput.value.trim();
    renderSubmitState();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();
    const rate = getRateLimitState();

    if (!isValidEmail(email)) {
      setError(t(locale, "invalidEmail"));
      renderSubmitState();
      return;
    }

    if (rate.blocked) {
      const minutes = Math.max(1, Math.ceil(rate.remainingMs / 60000));
      setStatus(t(locale, "rateLimit", { m: minutes }), "warn-note");
      return;
    }

    if (Date.now() < cooldownUntil || isSubmitting) {
      renderSubmitState();
      return;
    }

    await sendMagicLink(email);
  });

  resendBtn.addEventListener("click", async () => {
    const rate = getRateLimitState();
    const email = (lastSentEmail || emailInput.value || "").trim();

    if (!email || !isValidEmail(email)) {
      setStatus(t(locale, "invalidEmail"), "warn-note");
      return;
    }

    if (Date.now() < cooldownUntil || isSubmitting) {
      renderSubmitState();
      return;
    }

    if (rate.blocked) {
      const minutes = Math.max(1, Math.ceil(rate.remainingMs / 60000));
      setStatus(t(locale, "rateLimit", { m: minutes }), "warn-note");
      return;
    }

    await sendMagicLink(email);
  });
});
