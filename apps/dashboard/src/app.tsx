import React from "react";
import { Route, Routes } from "react-router";
import { PublicRoute } from "@/components/route-guards/public-route";
import { ProtectedRoute } from "@/components/route-guards/protected-route";
import { AuthLayout } from "@/components/layouts/auth-layout";
import { AppLayout } from "@/components/layouts/app-layout";
import { LoginPage } from "@/pages/auth/login/login-page";
import { DashboardPage } from "@/pages/dashboard/dashboard-page";
import { NotFoundPage } from "@/pages/not-found/not-found-page";

export const App: React.FC = () => {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
