import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./hooks/useAuth";
import { useCompany } from "./hooks/useCompany";
import { useIsSuperAdmin } from "./hooks/useIsSuperAdmin";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { NoCompanyPage } from "./pages/onboarding/NoCompanyPage";
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
import { MeasurementsPage } from "./pages/measurements/MeasurementsPage";
import { SalesPage } from "./pages/sales/SalesPage";
import { TeachersPage } from "./pages/teachers/TeachersPage";
import { GradesPage } from "./pages/grades/GradesPage";
import { GuardiansPage } from "./pages/guardians/GuardiansPage";
import { AnnouncementsPage } from "./pages/announcements/AnnouncementsPage";
import { CoursesPage } from "./pages/courses/CoursesPage";
import { EnrollmentsPage } from "./pages/enrollments/EnrollmentsPage";
import { SuperAdminLayout } from "./pages/superadmin/SuperAdminLayout";
import { SuperAdminDashboardPage } from "./pages/superadmin/SuperAdminDashboardPage";
import { CompaniesPage } from "./pages/superadmin/CompaniesPage";
import { PlatformUsersPage } from "./pages/superadmin/PlatformUsersPage";
import { InvitationsPage } from "./pages/superadmin/InvitationsPage";
import { PlansPage } from "./pages/superadmin/PlansPage";
import { ModulesPage } from "./pages/superadmin/ModulesPage";
import { ActivityPage } from "./pages/superadmin/ActivityPage";
import { AuditPage } from "./pages/superadmin/AuditPage";
import { SuperAdminSettingsPage } from "./pages/superadmin/SuperAdminSettingsPage";

// Requiere sesión. Si el usuario aún no tiene empresa, lo manda a la
// pantalla de recuperación (Fase 22: crear una empresa ya no es de
// autoservicio, solo pasa dentro de redeem_invitation_code).
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { company, loading: companyLoading } = useCompany();

  if (authLoading || (session && companyLoading)) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (!company) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

// Requiere sesión pero SIN empresa todavía (pantalla de recuperación,
// no de autoservicio — ver NoCompanyPage).
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

// Requiere sesión Y profiles.is_superadmin = true. Un cliente normal que
// intente entrar a /superadmin/* (por ejemplo escribiendo la URL a mano)
// cae a /dashboard — la protección real de todas formas está en RLS
// (is_superadmin() en database/policies.sql), esto solo evita mostrarle
// una pantalla que igualmente no podría usar.
function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: superAdminLoading } = useIsSuperAdmin();

  if (authLoading || superAdminLoading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;
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
            <NoCompanyPage />
          </OnboardingRoute>
        }
      />

      {/* Panel SUPERADMIN — layout y navegación propios, distintos de
          los de una empresa (ver SuperAdminLayout.tsx). */}
      <Route
        path="/superadmin"
        element={
          <SuperAdminRoute>
            <SuperAdminLayout />
          </SuperAdminRoute>
        }
      >
        <Route index element={<SuperAdminDashboardPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="users" element={<PlatformUsersPage />} />
        <Route path="invitations" element={<InvitationsPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="modules" element={<ModulesPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="settings" element={<SuperAdminSettingsPage />} />
      </Route>

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
        <Route path="/measurements" element={<MeasurementsPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/teachers" element={<TeachersPage />} />
        <Route path="/grades" element={<GradesPage />} />
        <Route path="/guardians" element={<GuardiansPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/enrollments" element={<EnrollmentsPage />} />
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
