(function () {
  const LOCALE_KEY = "pricingplus_locale";

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
      ctaStart: "ابدأ الآن",
      ctaOpenTool: "افتح الأداة",
      ctaBackTool: "العودة إلى الأداة",

      homeTitle: "احسب سعرك الحقيقي قبل أن تخسر دون أن تشعر",
      homeSubtitle: "تسعير+ يساعدك على اتخاذ قرار سعر بسيط وواضح لمشروعك الصغير.",
      valueOne: "التكلفة الحقيقية للقطعة",
      valueTwo: "السعر الأدنى المقبول",
      valueThree: "نقطة التعادل والربح الشهري",
      audienceTitle: "لمن هذه الأداة؟",
      audienceBody: "مناسبة لمشاريع الحلويات والمنتجات اليدوية والعطور والطباعة والبيع عبر إنستغرام.",

      learnTitle: "تعلّم التسعير",
      learnSubtitle: "محتوى عربي مبسط للمشاريع الصغيرة",
      learnBasics: "الأساسيات",
      learnMistakes: "أخطاء شائعة",
      learnExamples: "أمثلة عملية",

      basicsTitle: "أساسيات التسعير",
      basicsIntro: "ابدأ بثلاثة عناصر: تكلفة المواد، وقتك، والمصاريف الثابتة الشهرية.",
      basicsPoint1: "لا تسعّر بناءً على سعر المنافس فقط.",
      basicsPoint2: "حوّل وقت العمل إلى تكلفة واضحة.",
      basicsPoint3: "أضف هامش أمان بسيط عند عدم اليقين.",

      mistakesTitle: "أخطاء شائعة",
      mistakesIntro: "هذه أخطاء تتكرر كثيراً في المشاريع المنزلية الصغيرة:",
      mistake1: "نسيان احتساب وقتك الشخصي ضمن التكلفة.",
      mistake2: "اعتبار كل المصاريف ثابتة أو كلها متغيرة.",
      mistake3: "تحديد سعر البيع قبل معرفة نقطة التعادل.",

      examplesTitle: "أمثلة عملية",
      examplesIntro: "أمثلة مبسطة تساعدك على فهم القرار السعري بسرعة.",
      example1: "قطعة منفردة: تحقق تغطية التكلفة الأساسية.",
      example2: "علبة 6 قطع: تضيف تغليفاً وتحقق ربحاً أعلى.",
      example3: "باكج موسمي: يحتاج متابعة هامش الربح بعناية.",

      howTitle: "كيف نحسب داخل تسعير+؟",
      howIntro: "الحساب يعتمد على عناصر واضحة بدون تعقيد محاسبي.",
      how1: "المواد: مجموع تكلفة المكونات.",
      how2: "الوقت: أجر الساعة محول إلى دقائق العمل.",
      how3: "الثابت: توزيع المصاريف الشهرية على الوحدات المتوقعة.",
      how4: "التوصيل: يُحتسب حسب طريقة البيع إذا كان على التاجر.",
      how5: "التعادل: عدد القطع اللازمة لتغطية المصاريف.",

      supportTitle: "دعم المشروع",
      supportIntro: "تسعير+ مجاني حالياً لأننا نريد أن يستفيد أكبر عدد من أصحاب المشاريع الصغيرة.",
      supportBody: "إذا ساعدتك الأداة، دعمك يساعدنا نطورها ليستفيد غيرك.",
      supportPaypal: "دعم عبر PayPal",
      supportStripe: "دعم عبر Stripe",
      supportCoffee: "دعم عبر BuyMeACoffee",

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
      ctaStart: "Start now",
      ctaOpenTool: "Open tool",
      ctaBackTool: "Back to tool",

      homeTitle: "Know your real price before you lose money without noticing",
      homeSubtitle: "PricingPlus helps small businesses set clear, practical pricing decisions.",
      valueOne: "True unit cost",
      valueTwo: "Minimum acceptable price",
      valueThree: "Break-even and monthly profit",
      audienceTitle: "Who is this for?",
      audienceBody: "Great for home bakers, handmade products, perfumes, printing, and Instagram sellers.",

      learnTitle: "Learn Pricing",
      learnSubtitle: "Simple learning content for small businesses",
      learnBasics: "Basics",
      learnMistakes: "Common mistakes",
      learnExamples: "Practical examples",

      basicsTitle: "Pricing basics",
      basicsIntro: "Start with three elements: materials, your time, and monthly fixed costs.",
      basicsPoint1: "Do not price only by competitor numbers.",
      basicsPoint2: "Convert your working time into explicit cost.",
      basicsPoint3: "Use a small safety margin when uncertain.",

      mistakesTitle: "Common mistakes",
      mistakesIntro: "These issues appear often in small home businesses:",
      mistake1: "Ignoring your own labor cost.",
      mistake2: "Treating all costs as fixed or all as variable.",
      mistake3: "Setting a selling price before checking break-even.",

      examplesTitle: "Practical examples",
      examplesIntro: "Short examples to make pricing choices clearer.",
      example1: "Single unit: covers core cost.",
      example2: "Box of 6: adds packaging and often improves profit.",
      example3: "Seasonal bundle: needs tighter margin monitoring.",

      howTitle: "How does PricingPlus calculate?",
      howIntro: "The model uses clear inputs without accounting jargon.",
      how1: "Materials: sum of component costs.",
      how2: "Time: hourly pay converted to labor minutes.",
      how3: "Fixed: monthly costs distributed over expected units.",
      how4: "Delivery: added per sales method when merchant pays.",
      how5: "Break-even: required units to cover monthly costs.",

      supportTitle: "Support the project",
      supportIntro: "PricingPlus is currently free to keep it accessible for small business owners.",
      supportBody: "If this tool helped you, your support helps us improve it for others.",
      supportPaypal: "Support via PayPal",
      supportStripe: "Support via Stripe",
      supportCoffee: "Support via BuyMeACoffee",

      aboutTitle: "About us",
      aboutBody: "We built PricingPlus because many small businesses sell without knowing their true cost. Our goal is to keep pricing practical, understandable, and accessible.",

      privacyTitle: "Privacy policy",
      privacy1: "Project data is stored locally on your device at this stage.",
      privacy2: "We do not sell your data or share it with third parties.",
      privacy3: "Cloud accounts may be added later with clear controls.",

      termsTitle: "Terms and conditions",
      terms1: "The tool provides estimation outputs to support decisions.",
      terms2: "You are responsible for final business pricing decisions.",
      terms3: "By using the tool, you accept this guidance-only scope.",

      loginTitle: "Login coming soon",
      loginBody: "Login will be available later for cloud save and sync.",
      accountTitle: "Account coming soon",
      accountBody: "Account page will be available later with data sync.",

      notFoundTitle: "404 - Page not found",
      notFoundBody: "The page you requested is not available right now."
    }
  };

  function getInitialLocale() {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved === "ar" || saved === "en") return saved;
    return "ar";
  }

  function applyLocale(locale) {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    localStorage.setItem(LOCALE_KEY, locale);

    const dict = TRANSLATIONS[locale] || TRANSLATIONS.ar;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      el.textContent = dict[key] || "";
    });

    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === locale);
      btn.setAttribute("aria-pressed", btn.dataset.lang === locale ? "true" : "false");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const initial = getInitialLocale();
    applyLocale(initial);

    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const locale = btn.dataset.lang === "en" ? "en" : "ar";
        applyLocale(locale);
      });
    });
  });
})();
