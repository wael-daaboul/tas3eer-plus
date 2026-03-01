(function () {
  const LOCALE_KEY = "pricingplus_locale";
  const LEGACY_LOCALE_KEYS = ["pricingplus_lang", "pricingplus-language", "locale", "language"];

  const TRANSLATIONS = {
    ar: {
      brand: "تسعير+",
      navHome: "الرئيسية",
      navApp: "الأداة",
      navLearn: "تعلّم التسعير",
      navHow: "كيف نحسب؟",
      navSupport: "دعم المشروع",
      navAbout: "من نحن",
      footerPrivacy: "سياسة الخصوصية",
      footerTerms: "الشروط",
      footerContact: "تواصل",
      footerVersion: "نسخة المشروع v1.0",
      homeTitle: "احسب سعرك الحقيقي قبل أن تخسر دون أن تشعر",
      homeSubtitle: "تسعير+ يحوّل التسعير من تخمين إلى قرار واضح. احسب تكلفة المنتج الفعلية ثم اختر سعر بيع مناسب بثقة.",
      homeQuickExample: "مثال سريع: إذا كانت تكلفة القطعة 3$ والمصاريف الشهرية 300$ وتبيع 100 قطعة — فالتكلفة الحقيقية ليست 3$ بل 6$ تقريبًا.",
      homeTrustLine: "مجانية 100% — بدون تسجيل — بدون اشتراك",
      homeHowItWorksTitle: "كيف تعمل؟",
      valueOne: "التكلفة الحقيقية للقطعة",
      valueTwo: "السعر الأدنى المقبول",
      valueThree: "نقطة التعادل والربح الشهري",
      valueOneDesc: "اعرف تكلفة القطعة كاملة مع الوقت والمصاريف.",
      valueTwoDesc: "احسب أقل سعر يحميك من الخسارة.",
      valueThreeDesc: "اعرف كم قطعة تحتاج لتغطية مصاريفك ثم تبدأ بالربح.",
      whyNeedTitle: "لماذا قد تخسر دون أن تشعر؟",
      whyNeedPoint1: "لأنك تحسب المواد فقط.",
      whyNeedPoint2: "لأنك لا توزع المصاريف على كل قطعة.",
      whyNeedPoint3: "لأنك لا تعرف نقطة التعادل.",
      audienceTitle: "لمن هذه الأداة؟",
      audienceBody: "لأصحاب المشاريع المنزلية والبيع عبر إنستغرام: حلويات، عطور، منتجات يدوية، طباعة، وغيرها.",

      ctaStart: "ابدأ الآن",
      ctaOpenTool: "افتح الأداة",
      ctaOpenInTool: "افتح داخل الأداة",
      ctaTryTool: "جرّب في الأداة",
      ctaBackTool: "العودة إلى الأداة",
      ctaLearnBasics: "تعلّم الأساسيات",

      learnTitle: "تعلّم التسعير",
      learnSubtitle: "محتوى عربي مبسط للمشاريع الصغيرة",
      learnBasics: "الأساسيات",
      learnBasicsDesc: "افهم الفرق بين التكلفة الثابتة والمتغيرة وكيف تسعّر بثقة.",
      learnMistakes: "أخطاء شائعة",
      learnMistakesDesc: "أكثر الأخطاء التي تقع فيها المشاريع المنزلية وكيف تتجنبها.",
      learnExamples: "أمثلة عملية",
      learnExamplesDesc: "نماذج مختصرة لمنتجات حقيقية تساعدك على التطبيق فوراً.",

      basicsTitle: "الأساسيات",
      basicsIntro: "خمسة مفاهيم تكفي لتبدأ تسعيرك بشكل صحيح.",
      conceptFixedTitle: "التكلفة الثابتة",
      conceptFixedBody: "مصاريف شهرية تدفعها حتى لو لم تبع شيئاً.",
      conceptFixedExample: "مثال: إيجار 100$ شهرياً.",
      conceptVariableTitle: "التكلفة المتغيرة",
      conceptVariableBody: "تكلفة ترتفع كلما زاد الإنتاج أو البيع.",
      conceptVariableExample: "مثال: مواد خام 2$ لكل قطعة.",
      conceptTimeTitle: "تكلفة الوقت",
      conceptTimeBody: "قيمة وقتك محسوبة بالدقائق داخل كل منتج.",
      conceptTimeExample: "مثال: 30 دقيقة عمل عند 10$/ساعة = 5$.",
      conceptWasteTitle: "الهدر",
      conceptWasteBody: "فاقد التصنيع الذي يزيد التكلفة الفعلية.",
      conceptWasteExample: "مثال: هدر 10% يرفع تكلفة المواد من 10 إلى 11.",
      conceptBreakEvenTitle: "نقطة التعادل",
      conceptBreakEvenBody: "عدد الوحدات المطلوبة لتغطية مصاريفك فقط.",
      conceptBreakEvenExample: "مثال: إذا الربح للوحدة 2$ والثابت 200$، التعادل 100 وحدة.",

      mistakesTitle: "أخطاء شائعة",
      mistakesIntro: "7 أخطاء تتكرر في المشاريع المنزلية والبيع عبر إنستغرام:",
      m1Title: "تسعير على سعر المنافس",
      m1Why: "يحدث لأن السعر الظاهر يبدو مرجعاً جاهزاً.",
      m1Fix: "احسب تكلفتك أولاً ثم قارن بعد ذلك.",
      m2Title: "إهمال أجر صاحب المشروع",
      m2Why: "يحدث لأن صاحب المشروع يعتبر وقته مجانياً.",
      m2Fix: "ضع أجر ساعة واقعي حتى لو كان بسيطاً في البداية.",
      m3Title: "نسيان المصاريف الثابتة",
      m3Why: "تظهر عادة بعد نهاية الشهر وليس أثناء الطلب.",
      m3Fix: "وزّع الثابت على الوحدات المتوقعة شهرياً.",
      m4Title: "اعتبار كل منتج مربحاً بنفس الطريقة",
      m4Why: "المنتجات تختلف في الوقت والهدر والتغليف.",
      m4Fix: "احسب كل منتج وطريقة بيع بشكل منفصل.",
      m5Title: "إدخال التوصيل بشكل عشوائي",
      m5Why: "أحياناً يدفعه الزبون وأحياناً التاجر.",
      m5Fix: "حدّد وضع التوصيل لكل طريقة بيع بوضوح.",
      m6Title: "عدم تحديث الأسعار",
      m6Why: "أسعار المواد تتغير تدريجياً دون ملاحظة.",
      m6Fix: "راجع المكتبة مرة شهرياً على الأقل.",
      m7Title: "البيع بدون هامش أمان",
      m7Why: "الثقة الزائدة في تقديرات التكاليف.",
      m7Fix: "أضف هامش أمان بسيط خصوصاً في البداية.",

      examplesTitle: "أمثلة عملية",
      examplesIntro: "3 أمثلة مختصرة لتصور طريقة الاستخدام:",
      ex1Title: "حلويات منزلية",
      ex1Body: "مواد: سكر/طحين/تغليف. وقت: 40 دقيقة. ثابت: إيجار وتجهيزات. طريقة بيع: قطعة أو علبة 6. توصيل: لكل طلب.",
      ex2Title: "عطور",
      ex2Body: "مواد: زيت عطري/كحول/عبوة. وقت: 20 دقيقة. ثابت: تسويق واشتراكات. طريقة بيع: 50ml أو 100ml. توصيل: مدمج ضمن السعر.",
      ex3Title: "منتجات يدوية",
      ex3Body: "مواد: خامات يدوية وتغليف. وقت: 60 دقيقة. ثابت: أدوات وتجهيزات. طريقة بيع: قطعة مفردة أو باكج. توصيل: يدفعه الزبون منفصلاً.",

      howTitle: "كيف نحسب داخل تسعير+؟",
      howIntro: "ست خطوات واضحة من الإدخال حتى القرار.",
      howStep1: "المواد: نحسب تكلفة كل مكوّن في الوحدة.",
      howStep2: "الوقت: نحول أجر الساعة إلى تكلفة دقائق العمل.",
      howStep3: "الثابت: نوزع المصاريف الشهرية على الوحدات المتوقعة.",
      howStep4: "طرق البيع: نوسع الحساب حسب عدد القطع والتغليف.",
      howStep5: "التوصيل: يدخل أو لا يدخل حسب من يتحمل التكلفة.",
      howStep6: "النتائج: تكلفة حقيقية، حد أدنى، سعر مقترح، تعادل.",

      supportTitle: "دعم المشروع",
      supportIntro: "تسعير+ مجاني حالياً لأننا نريد أداة مفيدة ومباشرة للمشاريع الصغيرة.",
      supportBody: "دعمك يساعدنا على تحسين المحتوى، تطوير الميزات، وإبقاء الأداة متاحة للجميع.",
      supportLevelSimple: "دعم بسيط",
      supportLevelMedium: "دعم متوسط",
      supportLevelBig: "دعم كبير",
      supportLevelSimpleDesc: "مساهمة خفيفة تشجّع استمرار المشروع.",
      supportLevelMediumDesc: "يساعدنا في تطوير محتوى تعليمي جديد.",
      supportLevelBigDesc: "يدعم تطوير خصائص أكبر للمرحلة القادمة.",
      supportPaypal: "PayPal (قريباً)",
      supportStripe: "Stripe (قريباً)",
      supportCoffee: "BuyMeACoffee (قريباً)",
      supportSoon: "روابط الدعم الفعلية ستُضاف قريباً.",
      supportCopyLink: "انسخ رابط صفحة الدعم",
      supportCopied: "تم نسخ رابط صفحة الدعم",
      supportCopyFailed: "تعذر النسخ، يمكنك نسخ الرابط يدوياً",

      aboutTitle: "من نحن",
      aboutBody: "أنشأنا تسعير+ لأن كثيراً من المشاريع الصغيرة تبيع بدون صورة واضحة للتكلفة الحقيقية. هدفنا أن نجعل التسعير مفهوماً وبسيطاً ومتاحاً للجميع.",

      privacyTitle: "سياسة الخصوصية",
      privacy1: "نخزن بيانات المشروع محلياً على جهازك في هذه المرحلة.",
      privacy2: "لا نبيع بياناتك ولا نشاركها مع جهات خارجية.",
      privacy3: "لاحقاً قد نضيف حسابات سحابية مع خيارات تحكم أوضح.",

      termsTitle: "الشروط والأحكام",
      terms1: "الأداة تقدم نتائج تقديرية للمساعدة في اتخاذ القرار.",
      terms2: "أنت مسؤول عن التحقق النهائي من الأسعار قبل الاعتماد التجاري.",
      terms3: "باستخدامك الأداة فإنك توافق على هذا الاستخدام الإرشادي.",

      loginTitle: "تسجيل الدخول قريباً",
      loginBody: "تسجيل الدخول سيكون متاحاً لاحقاً لحفظ البيانات سحابياً.",
      accountTitle: "حسابي قريباً",
      accountBody: "صفحة الحساب ستكون متاحة لاحقاً مع مزامنة البيانات.",

      notFoundTitle: "404 - الصفحة غير موجودة",
      notFoundBody: "الرابط الذي حاولت فتحه غير متاح حالياً."
    },
    en: {
      brand: "PricingPlus",
      navHome: "Home",
      navApp: "Tool",
      navLearn: "Learn Pricing",
      navHow: "How We Calculate",
      navSupport: "Support",
      navAbout: "About",
      footerPrivacy: "Privacy",
      footerTerms: "Terms",
      footerContact: "Contact",
      footerVersion: "Project version v1.0",
      homeTitle: "Know your real price before you lose money without noticing",
      homeSubtitle: "PricingPlus turns pricing from guessing into clear decisions. Calculate real cost first, then set a confident selling price.",
      homeQuickExample: "Quick example: If unit materials cost is $3, monthly overhead is $300, and you sell 100 units — the real unit cost isn't $3, it's about $6.",
      homeTrustLine: "100% free — No sign-up — No subscription",
      homeHowItWorksTitle: "How it works?",
      valueOne: "True unit cost",
      valueTwo: "Minimum acceptable price",
      valueThree: "Break-even and monthly profit",
      valueOneDesc: "See the full unit cost including time and overhead.",
      valueTwoDesc: "Find the minimum price that prevents loss.",
      valueThreeDesc: "Know how many units to cover costs and start profiting.",
      whyNeedTitle: "Why you might lose without noticing?",
      whyNeedPoint1: "Because you count materials only.",
      whyNeedPoint2: "Because overhead isn't spread per unit.",
      whyNeedPoint3: "Because break-even is unknown.",
      audienceTitle: "Who is this tool for?",
      audienceBody: "For home businesses and Instagram sellers: bakery, perfumes, handmade products, printing, and more.",

      ctaStart: "Start now",
      ctaOpenTool: "Open tool",
      ctaOpenInTool: "Open in tool",
      ctaTryTool: "Try in tool",
      ctaBackTool: "Back to tool",
      ctaLearnBasics: "Learn basics",

      learnTitle: "Learn Pricing",
      learnSubtitle: "Simple Arabic-first content for small businesses",
      learnBasics: "Basics",
      learnBasicsDesc: "Understand fixed vs variable costs and price with confidence.",
      learnMistakes: "Common mistakes",
      learnMistakesDesc: "Top home-business mistakes and how to avoid them.",
      learnExamples: "Practical examples",
      learnExamplesDesc: "Short real-use examples to apply quickly.",

      basicsTitle: "Basics",
      basicsIntro: "Five key concepts to start pricing correctly.",
      conceptFixedTitle: "Fixed cost",
      conceptFixedBody: "Monthly costs paid even with no sales.",
      conceptFixedExample: "Example: $100 monthly rent.",
      conceptVariableTitle: "Variable cost",
      conceptVariableBody: "Cost that increases with production or sales.",
      conceptVariableExample: "Example: $2 raw material per item.",
      conceptTimeTitle: "Time cost",
      conceptTimeBody: "Your labor value converted into per-item minutes.",
      conceptTimeExample: "Example: 30 min at $10/h = $5.",
      conceptWasteTitle: "Waste",
      conceptWasteBody: "Production loss that increases real cost.",
      conceptWasteExample: "Example: 10% waste raises materials from 10 to 11.",
      conceptBreakEvenTitle: "Break-even",
      conceptBreakEvenBody: "Units required to cover monthly costs.",
      conceptBreakEvenExample: "Example: if unit contribution is $2 and fixed is $200, break-even is 100 units.",

      mistakesTitle: "Common mistakes",
      mistakesIntro: "7 frequent mistakes in home and Instagram businesses:",
      m1Title: "Pricing by competitor only",
      m1Why: "Because visible prices look like a quick benchmark.",
      m1Fix: "Calculate your own cost first, then compare.",
      m2Title: "Ignoring owner labor",
      m2Why: "Owners often treat their time as free.",
      m2Fix: "Set a realistic hourly pay, even if low at start.",
      m3Title: "Forgetting fixed costs",
      m3Why: "They appear end-of-month, not per order.",
      m3Fix: "Distribute fixed costs over expected monthly units.",
      m4Title: "Assuming all products profit equally",
      m4Why: "Products differ in labor, waste, and packaging.",
      m4Fix: "Calculate each product and sales method separately.",
      m5Title: "Random delivery handling",
      m5Why: "Sometimes customer pays, sometimes merchant pays.",
      m5Fix: "Set delivery mode clearly per sales method.",
      m6Title: "Not updating prices",
      m6Why: "Material prices change gradually.",
      m6Fix: "Review your materials library monthly.",
      m7Title: "No safety margin",
      m7Why: "Overconfidence in estimates.",
      m7Fix: "Add a small safety margin, especially early.",

      examplesTitle: "Practical examples",
      examplesIntro: "3 short examples for quick understanding:",
      ex1Title: "Home bakery",
      ex1Body: "Materials: sugar/flour/packaging. Time: 40 min. Fixed: rent/tools. Sales method: piece or box of 6. Delivery: per order.",
      ex2Title: "Perfumes",
      ex2Body: "Materials: fragrance oil/alcohol/bottle. Time: 20 min. Fixed: marketing/subscriptions. Sales method: 50ml or 100ml. Delivery: included in price.",
      ex3Title: "Handmade products",
      ex3Body: "Materials: craft supplies and packaging. Time: 60 min. Fixed: tools/equipment. Sales method: single piece or bundle. Delivery: customer pays separately.",

      howTitle: "How PricingPlus calculates",
      howIntro: "Six clear steps from inputs to decisions.",
      howStep1: "Materials: cost of each component per unit.",
      howStep2: "Time: hourly pay converted into labor minutes.",
      howStep3: "Fixed: monthly costs allocated over expected units.",
      howStep4: "Sales methods: expanded by units and packaging.",
      howStep5: "Delivery: included or excluded by who pays.",
      howStep6: "Results: true cost, minimum, suggested price, break-even.",

      supportTitle: "Support the project",
      supportIntro: "PricingPlus is free to keep practical pricing accessible for small businesses.",
      supportBody: "Your support helps us improve content, features, and keep the tool available.",
      supportLevelSimple: "Simple support",
      supportLevelMedium: "Medium support",
      supportLevelBig: "Big support",
      supportLevelSimpleDesc: "A light contribution to keep momentum.",
      supportLevelMediumDesc: "Helps us create better learning content.",
      supportLevelBigDesc: "Supports larger product improvements.",
      supportPaypal: "PayPal (soon)",
      supportStripe: "Stripe (soon)",
      supportCoffee: "BuyMeACoffee (soon)",
      supportSoon: "Real support links will be published soon.",
      supportCopyLink: "Copy support page link",
      supportCopied: "Support page link copied",
      supportCopyFailed: "Copy failed, you can copy the URL manually",

      aboutTitle: "About us",
      aboutBody: "We built PricingPlus because many small businesses sell without knowing true cost. Our goal is practical, simple, accessible pricing.",

      privacyTitle: "Privacy policy",
      privacy1: "Project data is stored locally on your device at this stage.",
      privacy2: "We do not sell your data or share it with third parties.",
      privacy3: "Cloud accounts may be added later with clearer controls.",

      termsTitle: "Terms and conditions",
      terms1: "The tool provides estimation outputs for decision support.",
      terms2: "You are responsible for final business pricing decisions.",
      terms3: "Using the tool means accepting this guidance scope.",

      loginTitle: "Login coming soon",
      loginBody: "Login will be available later for cloud save and sync.",
      accountTitle: "Account coming soon",
      accountBody: "Account page will be available later with data sync.",

      notFoundTitle: "404 - Page not found",
      notFoundBody: "The page you requested is not available right now."
    }
  };

  let activeLocale = "en";

  function normalizeLocale(value) {
    return String(value || "").toLowerCase() === "ar" ? "ar" : "en";
  }

  function getLocale() {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved === "ar" || saved === "en") return saved;

    for (const key of LEGACY_LOCALE_KEYS) {
      const legacyValue = localStorage.getItem(key);
      if (!legacyValue) continue;
      const migrated = normalizeLocale(legacyValue);
      localStorage.setItem(LOCALE_KEY, migrated);
      return migrated;
    }

    const browserLanguage = (navigator.language || "en").toLowerCase();
    const locale = browserLanguage.startsWith("ar") ? "ar" : "en";
    localStorage.setItem(LOCALE_KEY, locale);
    return locale;
  }

  function setLocale(locale) {
    const next = normalizeLocale(locale);
    localStorage.setItem(LOCALE_KEY, next);
    applyLocale(next);
  }

  function t(locale, key) {
    return (TRANSLATIONS[locale] && TRANSLATIONS[locale][key]) || null;
  }

  function syncBrandLogo(locale) {
    const logo = document.getElementById("brandLogo");
    if (!logo) return;
    const isArabic = normalizeLocale(locale || activeLocale) === "ar";
    if (isArabic) {
      logo.src = "/assets/brand/logo-ar.svg";
      logo.alt = "Pricing+";
    } else {
      logo.src = "/assets/brand/logo-en.svg";
      logo.alt = "Pricing+";
    }
  }

  function applyLocale(locale, options = {}) {
    activeLocale = normalizeLocale(locale);
    document.documentElement.lang = activeLocale;
    document.documentElement.dir = activeLocale === "ar" ? "rtl" : "ltr";

    if (!options.skipPersist) {
      localStorage.setItem(LOCALE_KEY, activeLocale);
    }

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!el.dataset.defaultText) {
        el.dataset.defaultText = el.textContent;
      }
      const translated = t(activeLocale, key);
      el.textContent = translated == null ? el.dataset.defaultText : translated;
    });

    document.querySelectorAll(".lang-btn").forEach((btn) => {
      const isActive = btn.dataset.lang === activeLocale;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    syncBrandLogo(activeLocale);

    window.dispatchEvent(new CustomEvent("pricingplus:locale-changed", {
      detail: { locale: activeLocale }
    }));
  }

  function bindCopySupportLink() {
    const copyBtn = document.getElementById("copySupportLinkBtn");
    if (!copyBtn) return;

    copyBtn.addEventListener("click", async () => {
      const messageOk = t(activeLocale, "supportCopied");
      const messageFail = t(activeLocale, "supportCopyFailed");
      try {
        await navigator.clipboard.writeText(window.location.origin + "/support/");
        alert(messageOk);
      } catch (_) {
        alert(messageFail);
      }
    });
  }

  function normalizePath(path) {
    if (!path) return "/";
    const clean = path.replace(/\/index\.html$/, "/");
    if (clean.length > 1 && clean.endsWith("/")) return clean;
    return clean;
  }

  function syncActiveNavLink() {
    const currentPath = normalizePath(window.location.pathname);
    document.querySelectorAll(".nav a[href]").forEach((link) => {
      const href = link.getAttribute("href");
      const linkPath = normalizePath(new URL(href, window.location.origin).pathname);
      const isActive = linkPath === currentPath;
      link.classList.toggle("active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  // === Mobile Header Navigation ===
  function bindMobileNav() {
    const navToggle = document.querySelector(".nav-toggle");
    const siteNav = document.getElementById("siteNav");
    
    if (!navToggle || !siteNav) return;

    function closeNav() {
      siteNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }

    // Toggle menu
    navToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = siteNav.classList.contains("is-open");
      if (isOpen) {
        closeNav();
      } else {
        siteNav.classList.add("is-open");
        navToggle.setAttribute("aria-expanded", "true");
      }
    });

    // Close on click outside
    document.addEventListener("click", (e) => {
      if (siteNav.classList.contains("is-open")) {
        // If click is not inside the nav
        if (!siteNav.contains(e.target) && !navToggle.contains(e.target)) {
          closeNav();
        }
      }
    });

    // Close on link click inside nav
    siteNav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", closeNav);
    });

    // Close on escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && siteNav.classList.contains("is-open")) {
        closeNav();
        navToggle.focus();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyLocale(getLocale(), { skipPersist: true });
    bindCopySupportLink();
    syncActiveNavLink();
    bindMobileNav();

    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        setLocale(btn.dataset.lang);
      });
    });

    window.addEventListener("storage", (event) => {
      if (event.key !== LOCALE_KEY) return;
      const next = normalizeLocale(event.newValue);
      if (next === activeLocale) return;
      applyLocale(next, { skipPersist: true });
    });

    window.addEventListener("pricingplus:locale-changed", (event) => {
      const next = normalizeLocale(event?.detail?.locale);
      if (next === activeLocale) return;
      applyLocale(next, { skipPersist: true });
    });
  });
})();
