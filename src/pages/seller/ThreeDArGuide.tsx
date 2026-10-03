import React from "react";
import { PageHeader } from "../../components/Layout";

const external = {
  snapglb: "https://apps.apple.com/us/app/snapglb/id6760367647",
};

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <article className="guide-step-card">
      <div className="guide-step-card__num">{number}</div>
      <div className="guide-step-card__body">
        <h2>{title}</h2>
        <div>{children}</div>
      </div>
    </article>
  );
}

export default function ThreeDArGuide() {
  return (
    <>
      <PageHeader title="آموزش ساخت 3D و AR" />
      <div className="content seller-guide-page">
        <section className="guide-hero card">
          <div className="guide-hero__badge">3DMarketIran · راهنمای استاندارد</div>
          <h1>یک برداشت، دو خروجی: GLB + USDZ</h1>
          <p>
            برای این پروژه، راهنمای قبلی ساخت مدل با مسیر ساده‌تر SnapGLB جایگزین شده است؛
            مدل را یک‌بار اسکن می‌کنید و همان پروژه را برای نمایش 3D و AR آماده می‌کنید.
          </p>
          <div className="guide-hero__facts">
            <span>خروجی GLB + USDZ</span>
            <span>اسکن با LiDAR</span>
            <span>پردازش روی دستگاه</span>
            <span>پلن رایگان: ۲ اسکن در روز</span>
          </div>
          <a className="btn btn-primary" href={external.snapglb} target="_blank" rel="noreferrer">
            دریافت SnapGLB از App Store
          </a>
        </section>

        <div className="guide-grid">
          <Step number={1} title="SnapGLB را نصب کنید">
            <p>
              <a href={external.snapglb} target="_blank" rel="noreferrer">SnapGLB</a>
              {' '}برای iPhone و iPad با LiDAR عرضه شده، از اسکن سه‌بعدی با Object Capture استفاده می‌کند و مدل را در هر دو فرمت
              <strong> GLB </strong> و <strong>USDZ</strong> ذخیره می‌کند. نسخه رایگان طبق اطلاعات فعلی App Store تا ۲ اسکن در روز دارد.
            </p>
            <div className="guide-note">نیازمندی فعلی: iOS 17 یا بالاتر و دستگاه دارای LiDAR.</div>
          </Step>

          <Step number={2} title="ابعاد واقعی محصول را اندازه بگیرید">
            <p>
              قبل از اسکن، عرض، ارتفاع و عمق محصول را با متر دقیق ثبت کنید. این سه عدد مرجع کنترل مقیاس مدل هستند.
              نسبت ابعاد را تغییر ندهید؛ فقط در صورت نیاز Uniform Scale اعمال کنید.
            </p>
          </Step>

          <Step number={3} title="محصول و نور را آماده کنید">
            <ul>
              <li>محصول کاملاً ثابت باشد.</li>
              <li>نور یکنواخت و بدون سایه تند یا انعکاس شدید باشد.</li>
              <li>سطح خیلی شفاف، آینه‌ای یا کاملاً بدون بافت را تا حد ممکن کنترل کنید.</li>
              <li>پس‌زمینه ساده ولی دارای نشانه‌های بصری کافی باشد.</li>
            </ul>
          </Step>

          <Step number={4} title="Free Scan یا Turntable Scan را انتخاب کنید">
            <p>
              برای محصول ثابت می‌توانید گوشی را دور آن حرکت دهید یا از حالت Turntable استفاده کنید و خود محصول را بچرخانید.
              همه سمت‌ها، بالا و پایین را آرام و کامل پوشش دهید و فاصله دوربین را تا حد ممکن ثابت نگه دارید.
            </p>
          </Step>

          <Step number={5} title="مدل را تمیز و بازبینی کنید">
            <p>
              بخش‌های ناخواسته مثل میز یا محیط اطراف را حذف کنید. مدل را از چند زاویه بچرخانید و لبه‌ها، سطح پشتی و قسمت زیرین را بررسی کنید.
              هر نقطه ناقص باید قبل از Export اصلاح شود.
            </p>
          </Step>

          <Step number={6} title="مقیاس واقعی را کنترل کنید">
            <p>
              طول، عرض یا ارتفاع یک بعد شناخته‌شده را روی مدل با اندازه واقعی مقایسه کنید. LiDAR برای عمق و هندسه فضایی استفاده می‌شود،
              اما اندازه‌گیری واقعی محصول همچنان مرجع نهایی شماست؛ تغییر Scale باید فقط یکنواخت باشد.
            </p>
            <div className="guide-warning">
              <strong>نکته مهم:</strong> SnapGLB در فهرست رسمی App Store خروجی دو فرمت و استفاده از LiDAR را اعلام می‌کند، اما ابزار اندازه‌گیری ابعاد
              محصول را به‌عنوان قابلیت مستقل تضمین نکرده است. بنابراین کنترل نهایی را با اندازه‌های واقعی انجام دهید.
            </div>
          </Step>

          <Step number={7} title="هر دو خروجی را نگه دارید">
            <p>
              از مدل نهایی، <strong>GLB</strong> را برای نمایش سه‌بعدی سایت و <strong>USDZ</strong> را برای AR در iPhone/iPad نگه دارید.
              هر دو فایل باید از همان Capture و همان Scale ساخته شده باشند و قبل از آپلود یک‌بار بازبینی شوند.
            </p>
          </Step>

          <Step number={8} title="در پنل فروشنده آپلود کنید">
            <p>
              GLB یا GLTF را در «مدل سه‌بعدی» و USDZ را در «واقعیت افزوده» قرار دهید. برای هر محصول حداکثر
              <strong> ۵ عکس، ۱ فایل GLB/GLTF و ۱ فایل USDZ</strong> مجاز است؛ سیستم حتی در سطح API هم این سقف را کنترل می‌کند.
            </p>
          </Step>
        </div>

        <section className="guide-limits card">
          <div>
            <strong>قوانین آپلود این پروژه</strong>
            <span>حداکثر ۵ تصویر · ۱ GLB/GLTF · ۱ USDZ</span>
          </div>
          <a className="btn btn-primary" href={external.snapglb} target="_blank" rel="noreferrer">
            باز کردن SnapGLB
          </a>
        </section>
      </div>
    </>
  );
}
