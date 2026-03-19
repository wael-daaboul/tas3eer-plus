# Changelog - سجل التغييرات

All notable changes to **Pricing+ (تسعير+)** will be documented in this file.

---

## [1.5.0] - 2026-03-19
### "The Vanilla Milestone" - المحطة الأخيرة لنسخة الفانيلا

#### English
- **Architecture:** Complete transition to a Service Layer pattern, isolating Authentication (Supabase) and Database (IndexedDB) logic.
- **i18n:** Implemented a standard language-centric i18n engine with full support for RTL (Arabic) and LTR (English).
- **Routing:** Enabled Deep Linking via Hash Routing, ensuring browser navigation (Back/Forward) works as expected.
- **UX/UI:** Added a premium Toast Notification system, a custom glassmorphism Language Selector, and smart numeric input handling.
- **Stability:** Fixed "050" input issues and implemented strict numeric validation to prevent NaN errors.
- **Cleanup:** Full audit and removal of legacy v1.1 code, unified headers across all site sections (Learn, Support, etc.), and implemented a clean HTML source strategy.

#### العربية
- **المعمارية الهندسي:** تحول شامل لنمط (Service Layer)، مع عزل منطق المصادقة (Supabase) وقاعدة البيانات (IndexedDB).
- **التدويل (i18n):** بناء محرك لغات قياسي يعتمد على الملفات، مع دعم كامل للاتجاهات من اليمين لليسار (العربية) ومن اليسار لليمين (الإنجليزية).
- **التنقل (Routing):** تفعيل نظام الروابط العميقة (Hash Routing) لضمان عمل أزرار المتصفح (الرجوع/للأمام).
- **واجهة المستخدم (UX/UI):** إضافة نظام تنبيهات Toast احترافي، ومبدل لغات "منحوت" بتصميم Glassmorphism، وتحسين ذكي لخانات الأرقام.
- **الاستقرار:** معالجة مشكلة أخطاء المدخلات مثل (050) ومنع إدخال الحروف نهائياً لتجنب توقف التطبيق.
- **التوحيد والتطهير:** إجراء فحص شامل واستئصال كافة بقايا نسخة v1.1 القديمة، وتوحيد الهيدر في كافة أقسام الموقع (تعلم، دعم، وغيرها)، وتطبيق استراتيجية تنظيف كود HTML من النصوص المباشرة.

---

## [1.1.0] - Previous Versions
- Initial MVP with multi-step pricing calculator.
- Basic localStorage persistence.
- Simple bilingual support (binary switch).
