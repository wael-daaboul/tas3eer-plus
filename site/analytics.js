(function () {
  const GA4_MEASUREMENT_ID = "G-TBB0GP96ZS";
  const MAX_ERROR_MESSAGE_LENGTH = 180;

  const state = {
    initialized: false,
    gtagReady: false,
    pageViews: new Set(),
    errorHandlersBound: false
  };

  function sanitizeValue(value) {
    if (value == null) return undefined;
    if (typeof value === "string") return value.slice(0, MAX_ERROR_MESSAGE_LENGTH);
    if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
    if (typeof value === "boolean") return value;
    return String(value).slice(0, MAX_ERROR_MESSAGE_LENGTH);
  }

  function sanitizeParams(params = {}) {
    const out = {};
    Object.entries(params).forEach(([key, value]) => {
      const normalized = sanitizeValue(value);
      if (normalized !== undefined) {
        out[key] = normalized;
      }
    });
    return out;
  }

  function getCurrentLang() {
    const htmlLang = document.documentElement.lang;
    return htmlLang === "ar" ? "ar" : "en";
  }

  function getCurrentPage() {
    return window.location.pathname || "/";
  }

  function ensureGtagBootstrap() {
    if (!GA4_MEASUREMENT_ID || state.gtagReady) return;

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_MEASUREMENT_ID)}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA4_MEASUREMENT_ID, { send_page_view: false });
    state.gtagReady = true;
  }

  function safeCallGtag(command, name, params) {
    if (!GA4_MEASUREMENT_ID) return;
    ensureGtagBootstrap();
    if (typeof window.gtag !== "function") return;

    try {
      window.gtag(command, name, params);
    } catch (_) {
      // Do not break product flows when analytics fails.
    }
  }

  function trackEvent(name, params = {}) {
    if (!name) return;
    const payload = sanitizeParams(params);
    safeCallGtag("event", name, payload);
  }

  function trackPageView(optionalParams = {}) {
    const page = getCurrentPage();
    const dedupeKey = page;
    if (state.pageViews.has(dedupeKey)) return;
    state.pageViews.add(dedupeKey);

    const payload = sanitizeParams({
      page,
      lang: getCurrentLang(),
      ...optionalParams
    });
    safeCallGtag("event", "page_view", payload);
  }

  function trackError(type, message, extra = {}) {
    if (!type) return;
    const payload = sanitizeParams({
      message: sanitizeValue(message),
      ...extra
    });
    if (!payload.page) {
      payload.page = getCurrentPage();
    }
    trackEvent(type, payload);
  }

  function bindGlobalErrorHandlers() {
    if (state.errorHandlersBound) return;
    state.errorHandlersBound = true;

    window.addEventListener("error", (event) => {
      trackError("js_error", event.message || "unknown_error", {
        source: event.filename || "window.error",
        page: getCurrentPage()
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      const message = typeof reason === "string"
        ? reason
        : (reason && reason.message) || "unhandled_rejection";

      trackError("js_error", message, {
        source: "unhandledrejection",
        page: getCurrentPage()
      });
    });
  }

  function init() {
    if (state.initialized) return;
    state.initialized = true;

    if (GA4_MEASUREMENT_ID) {
      ensureGtagBootstrap();
    }
    bindGlobalErrorHandlers();
  }

  const api = {
    getMeasurementId: () => GA4_MEASUREMENT_ID,
    trackEvent,
    trackPageView,
    trackError,
    init
  };

  window.PricingPlusAnalytics = api;
  init();
})();
