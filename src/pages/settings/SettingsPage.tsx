import { useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { MyCompanyTab } from "./MyCompanyTab";
import { ProfileTab } from "./ProfileTab";
import { UsersTab } from "./UsersTab";
import { SecurityTab } from "./SecurityTab";
import { AuditTab } from "./AuditTab";

type Tab = "company" | "profile" | "users" | "security" | "audit";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "company", label: "Mi empresa", icon: "domain" },
  { key: "profile", label: "Perfil", icon: "person" },
  { key: "users", label: "Usuarios", icon: "group" },
  { key: "security", label: "Seguridad", icon: "lock" },
  { key: "audit", label: "Auditoría", icon: "history" },
];

// Roles ya es real (cambiar ADMIN/USUARIO desde la pestaña Usuarios), no
// necesita pestaña propia. Permisos granulares, Horarios, Notificaciones
// e Integraciones siguen sin pestaña — requieren tablas o backend que aún
// no existen (ver docs/notificaciones.md). Se agregan cuando construyamos eso.
export function SettingsPage() {
  const [tab, setTab] = useState<Tab>("company");

  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" subtitle="Administra tu empresa, tu cuenta y tu equipo." />

      <div className="flex gap-1 border-b border-outline-variant overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-3 text-label-md whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? "border-primary text-primary font-bold"
                : "border-transparent text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === "company" && <MyCompanyTab />}
        {tab === "profile" && <ProfileTab />}
        {tab === "users" && <UsersTab />}
        {tab === "security" && <SecurityTab />}
        {tab === "audit" && <AuditTab />}
      </div>
    </div>
  );
}
