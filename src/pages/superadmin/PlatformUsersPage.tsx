import { useEffect, useState } from "react";
import { listAllProfiles, type PlatformUser } from "../../services/superadmin";
import { PageHeader } from "../../components/PageHeader";
import { DataTable } from "../../components/DataTable";
import { Badge } from "../../components/ui/Badge";
import { formatDateLong } from "../../lib/utils";

export function PlatformUsersPage() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAllProfiles().then((data) => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        subtitle="Todas las personas registradas en NEXA360, de cualquier empresa."
      />
      <p className="text-label-sm text-on-surface-variant">
        No se muestra el correo electrónico aquí: vive en el sistema de autenticación de
        Supabase, no en esta tabla, y no se expone al frontend por seguridad.
      </p>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-body-sm text-on-surface-variant">
            Cargando...
          </div>
        ) : (
          <DataTable
            columns={[
              { header: "Nombre", render: (u: PlatformUser) => u.full_name ?? "—" },
              { header: "Teléfono", render: (u: PlatformUser) => u.phone ?? "—" },
              {
                header: "Tipo",
                render: (u: PlatformUser) => (
                  <Badge tone={u.is_superadmin ? "success" : "neutral"}>
                    {u.is_superadmin ? "SUPERADMIN" : "Usuario"}
                  </Badge>
                ),
              },
              {
                header: "Registrado",
                render: (u: PlatformUser) => formatDateLong(new Date(u.created_at)),
              },
            ]}
            rows={users}
            getRowKey={(u) => u.id}
            emptyMessage="Todavía no hay usuarios registrados."
          />
        )}
      </div>
    </div>
  );
}
