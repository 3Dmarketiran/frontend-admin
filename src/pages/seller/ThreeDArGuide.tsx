import React, { useState } from "react";
import { PageHeader } from "../../components/Layout";

type Platform = "ios" | "android";

const external = {
  realityComposer: "https://apps.apple.com/us/app/reality-composer/id1462358802",
  iosConverter: "https://apps.apple.com/us/app/3d-converter-and-viewer/id6796347329",
  kiri: "https://play.google.com/store/apps/details?id=com.kiriengine.app",
  blender: "https://www.blender.org/download/",
};

export default function ThreeDArGuide() {
  const [platform, setPlatform] = useState<Platform>("ios");

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="آموزش برداشت 3D و AR"
        description="مدل را با گوشی برداشت کنید، مقیاس واقعی را حفظ کنید و در پایان فایل‌های لازم را در محصول آپلود کنید."
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setPlatform("ios")}
            className={`rounded-2xl border p-4 text-right transition ${
              platform === "ios"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
            }`}
          >
            <div className="text-base font-black">iOS / iPhone / iPad</div>
            <div className={`mt-1 text-sm ${platform === "ios" ? "text-slate-200" : "text-slate-500"}`}>
              برداشت با Reality Composer و خروجی USDZ + GLB
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPlatform("android")}
            className={`rounded-2xl border p-4 text-right transition ${
              platform === "android"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
            }`}
          >
            <div className="text-base font-black">Android</div>
            <div className={`mt-1 text-sm ${platform === "android" ? "text-slate-200" : "text-slate-500"}`}>
              برداشت با KIRI Engine و خروجی GLB + USDZ
            </div>
          </button>
        </div>
      </section>

      {platform === "ios" ? <IOSGuide /> : <AndroidGuide />}
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex gap-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-sm font-black text-white">
          {number}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black text-slate-900">{title}</h2>
          <div className="mt-2 text-sm leading-7 text-slate-600">{children}</div>
        </div>
      </div>
    </article>
  );
}

function IOSGuide() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-7 text-blue-950">
        <strong>قبل از شروع:</strong> Object Capture در Reality Composer به دستگاه‌های دارای LiDAR نیاز دارد. Apple در صفحه فعلی برنامه، iPhone 12 Pro یا جدیدتر و iPad Pro نسل پنجم یا جدیدتر را برای این قابلیت ذکر می‌کند.
      </div>

      <Step number={1} title="Reality Composer را نصب کنید">
        <p>
          برنامه رایگان <a className="font-bold underline" href={external.realityComposer} target="_blank" rel="noreferrer">Reality Composer</a> را از App Store نصب و باز کنید.
        </p>
      </Step>

      <Step number={2} title="Object Capture را باز کنید">
        <p>داخل Reality Composer، بخش Object Capture را انتخاب کنید و پروژه جدید برداشت را شروع کنید. هدف ما فقط ساخت مدل 3D است؛ لازم نیست صحنه AR یا امکانات اضافی بسازید.</p>
      </Step>

      <Step number={3} title="محصول را آماده کنید">
        <ul className="list-disc space-y-1 pr-5">
          <li>محصول را ثابت و در جای مناسب قرار دهید.</li>
          <li>نور یکنواخت باشد و انعکاس شدید یا شیشه تا حد ممکن نداشته باشید.</li>
          <li>زمینه ساده باشد، ولی محصول نقاط و بافت کافی برای تشخیص داشته باشد.</li>
          <li>قبل از شروع، ابعاد واقعی محصول را با متر/خط‌کش دقیق اندازه بگیرید و در پنل فروشنده نگه دارید.</li>
        </ul>
      </Step>

      <Step number={4} title="دور محصول حرکت کنید و تمام نقاط را پوشش دهید">
        <p>راهنمای خود برنامه را دنبال کنید. آرام و با فاصله تقریباً ثابت دور محصول حرکت کنید تا پوشش کامل ایجاد شود. از بالا و پایین محصول هم زاویه بگیرید و قسمت‌هایی را که راهنما ناقص نشان می‌دهد دوباره پوشش دهید.</p>
      </Step>

      <Step number={5} title="محدوده محصول را دقیق انتخاب کنید">
        <p>اگر برنامه محدوده/ناحیه بازسازی را نشان داد، فقط خود محصول را داخل محدوده قرار دهید و زمین، میز یا اشیای اضافی را تا حد ممکن خارج کنید. سپس اسکن را کامل و منتظر پردازش نهایی بمانید.</p>
      </Step>

      <Step number={6} title="خروجی اصلی را نگه دارید">
        <p>خروجی Object Capture در iOS به‌صورت USDZ قابل استفاده است. فایل USDZ را حذف نکنید؛ این نسخه اصلی مدل است و برای AR iOS نیز مفید است.</p>
      </Step>

      <Step number={7} title="یک نسخه GLB هم بسازید">
        <p>برای نمایش 3D در سایت، نسخه GLB هم لازم است. روی خود iPhone/iPad می‌توانید از برنامه رایگان <a className="font-bold underline" href={external.iosConverter} target="_blank" rel="noreferrer">3D Converter and Viewer</a> استفاده کنید: فایل USDZ را از Files باز کنید، حالت Convert را انتخاب کنید، خروجی GLB را بزنید و فایل جدید را در Files ذخیره کنید. این برنامه تبدیل را روی خود دستگاه انجام می‌دهد و طبق توضیحات فعلی App Store، USDZ را به‌عنوان ورودی و GLB را به‌عنوان خروجی پشتیبانی می‌کند.</p>
        <p className="mt-2">در زمان تبدیل هیچ Scale/Transform اضافه نکنید. هدف این است که USDZ اصلی و GLB تبدیل‌شده از یک هندسه و یک اندازه واقعی باشند.</p>
        <p className="mt-2">اگر این برنامه روی دستگاه شما در دسترس نبود، مسیر جایگزین روی Mac/Windows استفاده از Blender است.</p>
        <a className="mt-2 inline-block font-bold underline" href={external.blender} target="_blank" rel="noreferrer">مسیر جایگزین: دریافت Blender</a>
      </Step>

      <Step number={8} title="مقیاس واقعی را کنترل کنید — مهم‌ترین مرحله">
        <p>قبل از آپلود، ابعاد واقعی محصول را با اندازه‌ای که در پنل فروشنده ثبت کرده‌اید مقایسه کنید. اگر مدل در نرم‌افزار تبدیل کوچک یا بزرگ است، آن را با اندازه واقعی اصلاح کنید؛ اما نسبت ابعاد را تغییر ندهید.</p>
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
          <strong>هشدار:</strong> چون AR سایت روی محصولات دارای ابعاد واقعی با مقیاس ثابت اجرا می‌شود، مدل را برای «خوشگل‌تر شدن» یا جا شدن در صفحه Scale نکنید. اندازه واقعی محصول باید منبع اصلی باشد.
        </div>
      </Step>

      <Step number={9} title="هر دو فایل را در محصول ذخیره کنید">
        <p>در محصول، فایل GLB را در بخش «مدل سه‌بعدی» و فایل USDZ را در بخش «واقعیت افزوده» آپلود کنید. سپس ابعاد واقعی را در مرحله «ابعاد» ثبت و محصول را ذخیره/منتشر کنید.</p>
      </Step>
    </div>
  );
}

function AndroidGuide() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-7 text-emerald-950">
        <strong>پیشنهاد ما برای Android:</strong> از <a className="font-bold underline" href={external.kiri} target="_blank" rel="noreferrer">KIRI Engine</a> استفاده کنید. این برنامه روی Android در دسترس است، برای Photo Scan مدل مش‌بنیان می‌سازد و خروجی‌های GLB و USDZ را پشتیبانی می‌کند. مهم‌تر از همه برای پروژه ما، ابزار Measure و Rescale دارد تا یک فاصله واقعی را وارد کنید و مدل قبل از Export روی اندازه واقعی تنظیم شود.
      </div>

      <Step number={1} title="KIRI Engine را نصب کنید">
        <p>نسخه Android برنامه KIRI Engine را از Google Play نصب کنید. نسخه رایگان برای شروع قابل استفاده است؛ امکانات و تعداد/نوع خروجی ممکن است با پلن تغییر کند، بنابراین قبل از Export گزینه فرمت خروجی را بررسی کنید.</p>
      </Step>

      <Step number={2} title="Photo Scan را انتخاب کنید">
        <p>یک پروژه جدید بسازید و برای محصول معمولی از Photo Scan استفاده کنید. اگر محصول خیلی براق، شفاف یا تقریباً بدون بافت است، از حالت Featureless Object Scan استفاده کنید.</p>
      </Step>

      <Step number={3} title="محصول را ثابت کنید و دور آن حرکت کنید">
        <ul className="list-disc space-y-1 pr-5">
          <li>محصول در تمام مدت ثابت بماند.</li>
          <li>آرام و با فاصله تقریباً ثابت دور محصول حرکت کنید.</li>
          <li>از چند ارتفاع مختلف اسکن کنید تا بالا، وسط و پایین محصول پوشش داده شود.</li>
          <li>نور ثابت باشد و از بازتاب شدید و حرکت پس‌زمینه جلوگیری کنید.</li>
        </ul>
      </Step>

      <Step number={4} title="صبر کنید تا مدل ساخته شود">
        <p>بعد از کامل شدن پوشش، Capture را تمام کنید و منتظر پردازش بمانید. مدل نهایی را در 3D Viewer بررسی کنید و اگر بخشی از محصول ناقص است، قبل از Export اسکن را اصلاح یا دوباره انجام دهید.</p>
      </Step>

      <Step number={5} title="محدوده اضافی را حذف کنید">
        <p>اگر ابزار Crop/Mask در اختیار شماست، فقط خود محصول را نگه دارید و زمین، میز و اشیای اضافی را حذف کنید. هدف ما یک مش تمیز از خود محصول است.</p>
      </Step>

      <Step number={6} title="اندازه واقعی را با Measure و Rescale قفل کنید">
        <p>این مرحله برای 3DMarketIran <strong>اجباری</strong> است. در مدل نهایی وارد ابزار Measure شوید و دو نقطه‌ای را انتخاب کنید که فاصله واقعی آنها را می‌دانید؛ مثلاً عرض یک پایه یا طول یک لبه صاف.</p>
        <p className="mt-2">فاصله‌ای که برنامه تخمین می‌زند را با اندازه واقعی که با متر یا خط‌کش گرفته‌اید مقایسه کنید. سپس Rescale را بزنید و <strong>عدد واقعی</strong> همان فاصله را وارد کنید. مدل باید با همان نسبت و بدون تغییر شکل اصلاح شود.</p>
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
          <strong>خیلی مهم:</strong> فقط Scale کلی را اصلاح کنید. Width/Height/Depth را جداگانه تغییر ندهید و مدل را کش ندهید. AR سایت اندازه واقعی را قفل می‌کند؛ بنابراین اگر Scale اشتباه باشد، محصول در AR هم اشتباه نمایش داده می‌شود.
        </div>
      </Step>

      <Step number={7} title="هر دو خروجی GLB و USDZ را بگیرید">
        <p>از منوی Export، ابتدا <strong>GLB</strong> را بگیرید؛ این فایل برای نمایش 3D سایت است. سپس همان مدل را با همان Scale به <strong>USDZ</strong> خروجی بگیرید تا نسخه iOS/AR هم داشته باشیم. KIRI Engine در حالت‌های مش از جمله Photo Scan و Featureless Object Scan، GLB و USDZ را در فهرست فرمت‌های خروجی خود قرار داده است.</p>
      </Step>

      <Step number={8} title="اگر USDZ یا GLB در پلن شما در دسترس نبود">
        <p>مدل را به‌صورت GLTF/OBJ خروجی بگیرید و روی کامپیوتر با Blender تبدیل کنید. هنگام وارد کردن و Export هیچ Scale/Transform اضافه نکنید. Blender از فرمت‌های USD/USDZ و glTF/GLB پشتیبانی می‌کند.</p>
        <a className="mt-2 inline-block font-bold underline" href={external.blender} target="_blank" rel="noreferrer">دریافت Blender</a>
      </Step>

      <Step number={9} title="ابعاد واقعی را در پنل فروشنده ثبت کنید">
        <p>عرض، ارتفاع و عمق واقعی محصول را با اندازه‌گیری فیزیکی وارد مرحله «ابعاد» محصول کنید. این اعداد باید با مدل اصلاح‌شده هم‌خوان باشند. اگر اختلاف دارید، قبل از آپلود مدل را اصلاح کنید.</p>
      </Step>

      <Step number={10} title="فایل‌ها را در محصول آپلود کنید">
        <p>GLB را در «مدل سه‌بعدی» و USDZ را در «واقعیت افزوده» قرار دهید. در پایان محصول را ذخیره و منتشر کنید. فایل‌های عکس خام اسکن را لازم نیست در 3DMarketIran آپلود کنید؛ فقط فایل‌های نهایی مدل مورد نیاز هستند.</p>
      </Step>
    </div>
  );
}

