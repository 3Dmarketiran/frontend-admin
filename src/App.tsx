import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { ToastProvider } from "./lib/toast";
import Layout from "./components/Layout";
import Login from "./pages/Login";

import AdminOverview from "./pages/admin/Overview";
import AdminSellers from "./pages/admin/Sellers";
import AdminProducts from "./pages/admin/Products";
import AdminSubscriptions from "./pages/admin/Subscriptions";
import AdminPlans from "./pages/admin/Plans";
import AdminPublishing from "./pages/admin/Publishing";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminGitHubSettings from "./pages/admin/GitHubSettings";
import AdminBranding from "./pages/admin/Branding";
import AdminAuditLogs from "./pages/admin/AuditLogs";
import AdminSystemHealth from "./pages/admin/SystemHealth";

import SellerOverview from "./pages/seller/Overview";
import SellerProducts from "./pages/seller/Products";
import ProductWizard from "./pages/seller/ProductWizard";
import SellerAnalytics from "./pages/seller/Analytics";
import SellerSubscription from "./pages/seller/Subscription";
import SellerProfile from "./pages/seller/Profile";

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            <Route path="/admin" element={<Layout area="admin" />}>
              <Route index element={<AdminOverview />} />
              <Route path="sellers" element={<AdminSellers />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="subscriptions" element={<AdminSubscriptions />} />
              <Route path="plans" element={<AdminPlans />} />
              <Route path="publishing" element={<AdminPublishing />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="github" element={<AdminGitHubSettings />} />
              <Route path="branding" element={<AdminBranding />} />
              <Route path="audit-logs" element={<AdminAuditLogs />} />
              <Route path="health" element={<AdminSystemHealth />} />
            </Route>

            <Route path="/seller" element={<Layout area="seller" />}>
              <Route index element={<SellerOverview />} />
              <Route path="products" element={<SellerProducts />} />
              <Route path="products/new" element={<ProductWizard />} />
              <Route path="products/:id/edit" element={<ProductWizard />} />
              <Route path="analytics" element={<SellerAnalytics />} />
              <Route path="subscription" element={<SellerSubscription />} />
              <Route path="profile" element={<SellerProfile />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
