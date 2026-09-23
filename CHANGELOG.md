# خلاصه تغییرات (دیباگ و آماده‌سازی)

## 1) رفع باگ اصلی: آپلود لوگو / تصویر → «مسیر یافت نشد»
فایل: backend/src/index.ts
مشکل: فایل‌ها در پوشه‌ی `uploads` ذخیره می‌شدند اما سرور استاتیک از پوشه‌ی `storage`
سرو می‌کرد. در نتیجه بعد از آپلود موفق، درخواست نمایش فایل با 404 مواجه می‌شد.
راه‌حل: مسیر `express.static` به `uploads` اصلاح شد تا با محل واقعی ذخیره‌سازی
(`LocalStorageProvider`) یکی باشد.

## 2) آماده‌سازی برای مهاجرت از GitHub Pages به دامنه‌ی اختصاصی
- frontend-admin/vite.config.ts: مسیر پایه (base) از مقدار هاردکد `/frontend-admin/`
  به متغیر محیطی `PUBLIC_BASE_PATH` تبدیل شد (دقیقاً هم‌الگو با ریپازیتوری test-site).
- frontend-admin/.github/workflows/deploy.yml: متغیر `PUBLIC_BASE_PATH` به مرحله‌ی
  build اضافه شد. برای دامنه‌ی اختصاصی کافیست در تنظیمات GitHub → Settings → 
  Variables مقدار `PUBLIC_BASE_PATH=/` تعریف شود؛ بدون نیاز به تغییر کد.
- backend: تنظیمات env.ts و هر دو StorageProvider (Local/S3) از قبل کاملاً مبتنی بر
  متغیر محیطی هستند و به هیچ دامنه یا سرویس خاصی وابسته نیستند.

## 3) آماده‌سازی برای آپگرید Supabase و Render
- S3StorageProvider از قبل به‌صورت صریح از Supabase Storage (S3-compatible API)،
  Cloudflare R2، DigitalOcean Spaces و MinIO پشتیبانی می‌کند. برای آپگرید پلن
  Supabase یا Render فقط کافیست متغیرهای محیطی زیر تنظیم/به‌روزرسانی شوند —
  نیازی به تغییر کد نیست:
  STORAGE_PROVIDER=s3, STORAGE_BUCKET, STORAGE_ENDPOINT,
  STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY, PUBLIC_ASSET_BASE_URL, DATABASE_URL

## 4) پروفایل فروشگاهی شبیه اینستاگرام: فیلد «آدرس»
اضافه شد در تمام لایه‌ها:
- backend/prisma/schema.prisma + migration جدید (add_seller_address)
- backend/src/routes/sellers.ts (validation و ذخیره‌سازی در PUT /api/sellers/:id)
- backend/src/services/publishService.ts (شامل شدن در خروجی JSON عمومی)
- frontend-admin/src/types.ts + src/pages/seller/Profile.tsx (فرم ویرایش پروفایل)
- test-site/src/types/index.ts + src/pages/SellerStore.tsx (نمایش در صفحه فروشگاه،
  به‌صورت متن آزاد همراه با آیکون مکان)

## 5) پرمیوم / انیمیشن
- test-site/src/styles/global.css: کلاس‌های fade-in-up (با رعایت کامل
  prefers-reduced-motion که در پروژه از قبل تعریف شده بود)
- test-site/src/pages/SellerStore.tsx: انیمیشن ورود روی باکس اطلاعات فروشگاه و
  کارت‌های محصول (با تأخیر پلکانی برای حس پرمیوم‌تر)

## نکات مهم قبل از دیپلوی
1. باید مایگریشن جدید پریزما اجرا شود:
   cd backend && npx prisma migrate deploy
2. چون تایپ‌اسکریپت/npm در این محیط قابل اجرا نبود (بدون دسترسی شبکه)، پیشنهاد می‌شود
   قبل از push، به‌صورت محلی `npm run build` را در هر سه ریپازیتوری اجرا کنید تا از
   صحت کامپایل مطمئن شوید.
3. مقدار CORS_ORIGIN در بک‌اند باید بعد از مهاجرت دامنه به‌روزرسانی شود تا دامنه‌ی
   جدید frontend-admin و test-site را شامل شود.

## به‌روزرسانی: رفع خطاهای بیلد (GitHub Actions)
بعد از آپلود روی گیت‌هاب، بیلد با ۱۰ خطای TypeScript fail می‌شد. همه رفع شدن:
- src/pages/seller/Subscription.tsx و src/pages/seller/Products.tsx: مسیرهای import
  اشتباه (components/UI, components/Toast, components/PageHeader) با الگوی درست
  پروژه (components/ui, components/Layout, lib/toast) جایگزین شدند؛ فراخوانی‌های
  toast.error/success به useToast()/push تبدیل شدند.
- src/types.ts: فیلد updatedAt به تایپ Product اضافه شد (در بک‌اند از قبل وجود داشت).
- Subscription.tsx: چک plan.discountPct > 0 برای مقدار nullable اصلاح شد.
- src/lib/api.ts: متد patch اضافه شد (بک‌اند از قبل روت PATCH /api/categories/:id/status
  را داشت، فقط کلاینت فاقد این متد بود).
- src/components/ui.tsx: EmptyState برای پذیرفتن title/description (علاوه بر text) گسترش
  یافت تا با هر دو الگوی استفاده‌شده در پروژه سازگار باشد.
- VisibilityBadge و PublishJobStatus: پراپ و نوع import اشتباه اصلاح شد.
- Tailwind CSS (با preflight غیرفعال) اضافه شد چون این دو صفحه به کلاس‌های Tailwind
  وابسته بودند ولی پروژه Tailwind نصب نداشت.

نکته: قابلیت «افزودن دسته‌بندی از پنل ادمین» از قبل به‌طور کامل در
src/pages/admin/Categories.tsx پیاده‌سازی شده بود؛ فقط به‌خاطر خطای api.patch از بالا
کل بیلد fail می‌شد. با رفع آن خطا، این قابلیت اکنون در دسترس است.
