# PricingPlus (تسعير+) MVP

موقع وأداة تسعير محلية (Static Multi-Page) للمشاريع الصغيرة.

## خريطة الصفحات
- `/index.html` الصفحة الرئيسية (Landing)
- `/app/index.html` صفحة الأداة
- `/learn/index.html` تعلّم التسعير
- `/learn/basics.html` الأساسيات
- `/learn/common-mistakes.html` أخطاء شائعة
- `/learn/examples.html` أمثلة عملية
- `/how-it-works/index.html` كيف نحسب؟
- `/support/index.html` دعم المشروع
- `/about/index.html` من نحن
- `/privacy/index.html` سياسة الخصوصية
- `/terms/index.html` الشروط والأحكام
- `/login/index.html` Placeholder تسجيل الدخول
- `/account/index.html` Placeholder حسابي
- `/404.html` صفحة 404

## الهيكل
- `/site/site.css` أنماط الصفحات العامة (Header/Nav/Footer/Hero/Card Grid/Buttons)
- `/site/site.js` تبديل اللغة AR/EN للصفحات العامة + RTL/LTR
- `/styles.css` أنماط الأداة الأساسية
- `/src/main.js` واجهة الأداة ومنطق الربط
- `/src/engine/pricingEngine.js` محرك الحسابات (Pure Functions)
- `/src/storage/storageProvider.js` abstraction التخزين
- `/src/storage/indexedDbProvider.js` IndexedDB + migrations
- `/src/services/exportService.js` التصدير CSV/XLSX/PDF

## تشغيل المشروع محلياً
1. شغّل خادم ملفات ثابت:
   - `python3 -m http.server 5173`
2. افتح:
   - الصفحة الرئيسية: [http://localhost:5173](http://localhost:5173)
   - الأداة مباشرة: [http://localhost:5173/app/](http://localhost:5173/app/)

## الاختبارات
1. تأكد من وجود Node.js.
2. شغّل:
   - `npm test`

## نطاق الإصدار الحالي
- لا يوجد Backend.
- لا يوجد نظام مخزون أو ERP.
- لا يوجد تسجيل دخول فعلي بعد (صفحات Placeholder فقط).
