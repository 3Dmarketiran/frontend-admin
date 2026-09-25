import React, { useEffect, useState } from "react";
import { NavLink, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { PUBLIC_SITE_URL } from "../lib/config";

const ADMIN_NAV = [
  { to: "/admin", label: "نمای کلی", end: true, icon: "grid" },
  { to: "/admin/sellers", label: "فروشندگان", icon: "store" },
  { to: "/admin/products", label: "محصولات", icon: "box" },
  { to: "/admin/categories", label: "دسته‌بندی‌ها", icon: "folder" },
  { to: "/admin/subscriptions", label: "اشتراک‌ها", icon: "card" },
  { to: "/admin/plans", label: "پلن‌های اشتراک", icon: "layers" },
  { to: "/admin/publishing", label: "انتشار", icon: "send" },
  { to: "/admin/analytics", label: "آنالیتیکس", icon: "chart" },
  { to: "/admin/github", label: "GitHub", icon: "link" },
  { to: "/admin/branding", label: "برندینگ / تنظیمات", icon: "palette" },
  { to: "/admin/audit-logs", label: "گزارش‌های رویداد", icon: "list" },
  { to: "/admin/health", label: "سلامت سیستم", icon: "pulse" },
];

const SELLER_NAV = [
  { to: "/seller", label: "نمای کلی", end: true, icon: "grid" },
  { to: "/seller/products", label: "محصولات من", icon: "box" },
  { to: "/seller/products/new", label: "افزودن محصول", icon: "plus" },
  { to: "/seller/analytics", label: "آنالیتیکس", icon: "chart" },
  { to: "/seller/subscription", label: "اشتراک من", icon: "card" },
  { to: "/seller/profile", label: "پروفایل فروشگاه", icon: "store" },
];

export default function Layout({ area }: { area: "admin" | "seller" }) {
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [area]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  if (area === "admin" && !isAdmin) return <Navigate to="/seller" replace />;
  if (area === "seller" && isAdmin) return <Navigate to="/admin" replace />;
  if (area === "seller" && !user.seller) return <Navigate to="/login" replace />;

  const nav = area === "admin" ? ADMIN_NAV : SELLER_NAV;
  const displayName = area === "seller" ? (user.seller?.storeName || user.email) : roleLabel(user.role);

  return (
    <div className="app-shell">
      {menuOpen && <button className="mobile-menu-backdrop" aria-label="بستن منو" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar${menuOpen ? " open" : ""}`}>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">3D</span>
          <span>3DMarketiran</span>
        </div>
        <div className="sidebar-heading">{area === "admin" ? "مدیریت پلتفرم" : "مدیریت فروشگاه"}</div>
        <nav>
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? "active" : ""}>
              <span className="nav-icon" aria-hidden="true"><SidebarIcon name={item.icon} /></span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        {area === "seller" && user.seller && (
          <a
            className="public-store-link"
            href={`${PUBLIC_SITE_URL}/#/sellers/${encodeURIComponent(user.seller.slug)}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            <span className="public-store-link__icon"><SidebarIcon name="external" /></span>
            <span><small>پروفایل عمومی</small><strong>مشاهده فروشگاه در سایت</strong></span>
          </a>
        )}
        {area === "seller" && (
          <NavLink to="/seller/subscription" className="subscription-chip" style={{ textDecoration: "none" }}>
            <small>وضعیت اشتراک</small>
            <strong>مشاهده جزئیات پلن</strong>
          </NavLink>
        )}
        <div className="user-box">
          <div className="user-box__name">{displayName}</div>
          <div style={{ opacity: 0.72, fontSize: ".74rem", marginTop: 4, wordBreak: "break-word" }}>{user.email}</div>
          <button className="btn btn-outline btn-sm" onClick={logout}>خروج</button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar__left">
            <button className="btn btn-outline mobile-menu-button" style={{ display: "none" }} onClick={() => setMenuOpen(true)} aria-label="باز کردن منو">☰</button>
            <div>
              <div className="topbar-kicker">{area === "admin" ? "3DMarketiran" : "پنل فروشنده"}</div>
              <h1>{area === "admin" ? "داشبورد مدیریت" : "داشبورد فروشگاه"}</h1>
            </div>
          </div>
          <div className="topbar__right">
            <span className="topbar-user">{displayName}</span>
            <span className="badge badge-info">{roleLabel(user.role)}</span>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
}

function SidebarIcon({ name }: { name: string }) {
  const common = { width: 17, height: 17, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,
    store: <><path d="M4 10.5V20h16v-9.5"/><path d="M3 10.5h18L19 4H5l-2 6.5Z"/><path d="M8 20v-5h8v5"/></>,
    box: <><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/></>,
    folder: <><path d="M3.5 6.5h6l2 2H20.5v9.8a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V6.5Z"/></>,
    card: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18"/><path d="M7 14h4"/></>,
    layers: <><path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4"/><path d="m4 17 8 4 8-4"/></>,
    send: <><path d="m3 11 18-7-7 18-3.5-7.5L3 11Z"/><path d="m10.5 14.5 4-4"/></>,
    chart: <><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 3-3 3 2 5-6"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.5.4l2-2a5 5 0 0 0-7.1-7.1l-1.2 1.2"/><path d="M14 11a5 5 0 0 0-7.5-.4l-2 2a5 5 0 0 0 7.1 7.1l1.2-1.2"/></>,
    palette: <><path d="M12 3a9 9 0 1 0 0 18h1.2a1.8 1.8 0 0 0 0-3.6H12a2 2 0 0 1 0-4h2.5a6.5 6.5 0 0 0 6.5-6.5A9 9 0 0 0 12 3Z"/><circle cx="7.5" cy="9" r=".7" fill="currentColor"/><circle cx="11" cy="6.8" r=".7" fill="currentColor"/><circle cx="15.2" cy="7.2" r=".7" fill="currentColor"/></>,
    list: <><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r=".8" fill="currentColor"/><circle cx="4" cy="12" r=".8" fill="currentColor"/><circle cx="4" cy="18" r=".8" fill="currentColor"/></>,
    pulse: <><path d="M3 12h4l2-5 4 10 2-5h6"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    external: <><path d="M14 5h5v5"/><path d="M13 11 19 5"/><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></>,
  };
  return <svg {...common}>{paths[name] ?? paths.grid}</svg>;
}

function roleLabel(role: string) {
  if (role === "SUPER_ADMIN") return "مدیر ارشد";
  if (role === "ADMIN") return "مدیر";
  return "فروشنده";
}

export function FullPageSpinner() {
  return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)" }}>در حال بارگذاری...</div>;
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="page-header-wrap">
      <div className="page-header-copy">
        <div className="page-header-kicker">مدیریت محتوا</div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
    </div>
  );
}
