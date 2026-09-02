import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./hooks/useAuth";
import { useCompany } from "./hooks/useCompany";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { SelectBusinessTypePage } from "./pages/onboarding/SelectBusinessTypePage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { ClientsPage } from "./pages/clients/ClientsPage";
import { ClientProfilePage } from "./pages/clients/ClientProfilePage";
import { AgendaPage } from "./pages/agenda/AgendaPage";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import { ServicesPage } from "./pages/services/ServicesPage";
import { RemindersPage } from "./pages/reminders/RemindersPage";
import { ReportsPage } from "./pages/reports/ReportsPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { HistoryPage } from "./pages/history/HistoryPage";
import { TreatmentsPage } from "./pages/treatments/TreatmentsPage";
import { CheckupsPage } from "./pages/checkups/CheckupsPage";
import { PetsPage } from "./pages/pets/PetsPage";
import { VehiclesPage } from "./pages/vehicles/VehiclesPage";

// Requiere sesión. Si el usuario aún no tiene empresa, lo manda al
// onboarding antes de dejarlo entrar a cualquier pantalla interna.
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { company, loading: companyLoading } = useCompany();

  if (authLoading || (session && companyLoading)) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (!company) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

// Requiere sesión pero SIN empresa todavía (la pantalla de onboarding).
function OnboardingRoute({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { company, loading: companyLoading } = useCompany();

  if (authLoading || (session && companyLoading)) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (company) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnlyRoute>
            <ForgotPasswordPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <OnboardingRoute>
            <SelectBusinessTypePage />
          </OnboardingRoute>
        }
      />

      {/* Todas las rutas internas comparten el mismo Sidebar + Navbar */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/:id" element={<ClientProfilePage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/reminders" element={<RemindersPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/treatments" element={<TreatmentsPage />} />
        <Route path="/checkups" element={<CheckupsPage />} />
        <Route path="/pets" element={<PetsPage />} />
        <Route path="/vehicles" element={<VehiclesPage />} />
        {/* Cualquier módulo que el Sidebar ya lista (Servicios, Recordatorios,
            Tratamientos, Vehículos...) pero que todavía no tiene página real
            construida cae aquí, en vez de expulsar al usuario a /login. */}
        <Route path="*" element={<ComingSoonPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
