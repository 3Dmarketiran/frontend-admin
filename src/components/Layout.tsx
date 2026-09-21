import React from "react";
import { NavLink, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

const ADMIN_NAV = [
  { to: "/admin", label: "نمای کلی", end: true, icon: "📊" },
  { to: "/admin/sellers", label: "فروشندگان", icon: "🏬" },
  { to: "/admin/products", label: "محصولات", icon: "📦" },
  { to: "/admin/subscriptions", label: "اشتراک‌ها", icon: "💳" },
  { to: "/admin/plans", label: "پلن‌های اشتراک", icon: "🗂️" },
  { to: "/admin/publishing", label: "انتشار", icon: "🚀" },
  { to: "/admin/analytics", label: "آنالیتیکس", icon: "📈" },
  { to: "/admin/github", label: "GitHub", icon: "🔗" },
  { to: "/admin/branding", label: "برندینگ / تنظیمات", icon: "🎨" },
  { to: "/admin/audit-logs", label: "گزارش‌های رویداد", icon: "🗒️" },
  { to: "/admin/health", label: "سلامت سیستم", icon: "💓" },
];

const SELLER_NAV = [
  { to: "/seller", label: "نمای کلی", end: true, icon: "📊" },
  { to: "/seller/products", label: "محصولات من", icon: "📦" },
  { to: "/seller/products/new", label: "افزودن محصول", icon: "➕" },
  { to: "/seller/analytics", label: "آنالیتیکس", icon: "📈" },
  { to: "/seller/subscription", label: "اشتراک من", icon: "💳" },
  { to: "/seller/profile", label: "پروفایل فروشگاه", icon: "🏪" },
];

export default function Layout({ area }: { area: "admin" | "seller" }) {
  const { user, loading, logout } = useAuth();

  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  if (area === "admin" && !isAdmin) return <Navigate to="/seller" replace />;
  if (area === "seller" && isAdmin) return <Navigate to="/admin" replace />;
  if (area === "seller" && !user.seller) return <Navigate to="/login" replace />;

  const nav = area === "admin" ? ADMIN_NAV : SELLER_NAV;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">🧊 پنل {area === "admin" ? "مدیریت" : "فروشنده"}</div>
        <nav>
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "active" : "")}>
              <span aria-hidden>{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="user-box">
          <div>{user.email}</div>
          <div style={{ opacity: .7, fontSize: ".76rem" }}>{roleLabel(user.role)}{user.seller ? ` — ${user.seller.storeName}` : ""}</div>
          <button className="btn btn-outline btn-sm" onClick={logout}>خروج</button>
        </div>
      </aside>
      <div className="main-area">
        <Outlet />
      </div>
    </div>
  );
}

function roleLabel(role: string) {
  if (role === "SUPER_ADMIN") return "مدیر ارشد";
  if (role === "ADMIN") return "مدیر";
  return "فروشنده";
}

export function FullPageSpinner() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)" }}>
      در حال بارگذاری...
    </div>
  );
}

export function PageHeader({ title }: { title: string }) {
  return (
    <div className="topbar">
      <h1>{title}</h1>
    </div>
  );
}
