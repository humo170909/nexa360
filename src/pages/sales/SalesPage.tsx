import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useCompany } from "../../hooks/useCompany";
import { useBusinessType } from "../../hooks/useBusinessType";
import { listSales, createSale, updateSale, deleteSale, type SaleInput } from "../../services/sales";
import { listClients } from "../../services/clients";
import { logAction } from "../../services/auditLogs";
import type { SaleWithOwner } from "../../types/sale";
import type { Client } from "../../types/client";
import { DataTable } from "../../components/DataTable";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { formatDateLong } from "../../lib/utils";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm: SaleInput = {
  owner_id: "",
  item_name: "",
  quantity: 1,
  unit_price: 0,
  sold_at: todayIso(),
  notes: "",
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat("es", { style: "currency", currency: "USD" }).format(price);
}

export function SalesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { company, role } = useCompany();
  const businessType = useBusinessType();
  const entityLabel = businessType?.entityLabel ?? "Clientes";
  const title = businessType?.extraModules.find((m) => m.key === "sales")?.label ?? "Ventas";

  const [sales, setSales] = useState<SaleWithOwner[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SaleWithOwner | null>(null);
  const [form, setForm] = useState<SaleInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(currentSearch: string) {
    if (!company) return;
    setLoading(true);
    const data = await listSales(company.id, { search: currentSearch });
    setSales(data);
    setLoading(false);
  }

  useEffect(() => {
    if (!company) return;
    refresh("");
    listClients(company.id).then(setClients);
  }, [company]);

  useEffect(() => {
    const timer = setTimeout(() => refresh(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, owner_id: clients[0]?.id ?? "", sold_at: todayIso() });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(sale: SaleWithOwner) {
    setEditing(sale);
    setForm({
      owner_id: sale.owner_id,
      item_name: sale.item_name,
      quantity: sale.quantity,
      unit_price: sale.unit_price,
      sold_at: sale.sold_at.slice(0, 10),
      notes: sale.notes ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!company || !form.item_name.trim() || !form.owner_id) return;
    setSaving(true);
    setError(null);

    if (editing) {
      const { error } = await updateSale(editing.id, form);
      if (error) {
        setError("No se pudo guardar los cambios.");
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, "sale.update", { sale_id: editing.id });
    } else {
      const { data, error } = await createSale(company.id, form);
      if (error) {
        setError("No se pudo registrar la venta.");
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, "sale.create", { sale_id: data?.id });
    }

    setSaving(false);
    setModalOpen(false);
    refresh(search);
  }

  async function handleDelete(sale: SaleWithOwner) {
    if (!company) return;
    if (!confirm(`¿Eliminar la venta de "${sale.item_name}"? Esta acción no se puede deshacer.`))
      return;
    const { error } = await deleteSale(sale.id);
    if (error) {
      alert("No se pudo eliminar (revisa tus permisos).");
      return;
    }
    await logAction(company.id, user?.id ?? null, "sale.delete", { sale_id: sale.id });
    refresh(search);
  }

  const totalRevenue = sales.reduce((sum, s) => sum + s.quantity * s.unit_price, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle="Registro de ventas de lentes, armazones y accesorios."
        action={
          clients.length > 0
            ? { label: "Nueva", icon: "add", onClick: openCreate }
            : undefined
        }
      />

      {clients.length === 0 && !loading ? (
        <p className="text-body-sm text-on-surface-variant">
          Registra al menos un {entityLabel.toLowerCase().replace(/s$/, "")} antes de poder
          registrar una venta.
        </p>
      ) : null}

      {sales.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Ventas registradas" value={String(sales.length)} icon="point_of_sale" />
          <StatCard label="Total acumulado" value={formatPrice(totalRevenue)} icon="payments" />
          <StatCard
            label="Ticket promedio"
            value={formatPrice(totalRevenue / sales.length)}
            icon="receipt_long"
          />
        </div>
      ) : null}

      <div className="relative max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
          search
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por artículo o cliente..."
          className="w-full h-10 pl-10 pr-4 rounded-lg bg-surface-container-lowest border border-outline-variant text-body-sm focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all"
        />
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-body-sm text-on-surface-variant">
            Cargando...
          </div>
        ) : (
          <DataTable
            columns={[
              { header: "Artículo", render: (s: SaleWithOwner) => s.item_name },
              {
                header: entityLabel,
                render: (s: SaleWithOwner) => (
                  <button
                    onClick={() => navigate(`/clients/${s.owner_id}`)}
                    className="text-primary font-medium hover:underline"
                  >
                    {s.owner_name}
                  </button>
                ),
              },
              { header: "Cantidad", render: (s: SaleWithOwner) => s.quantity },
              { header: "Precio unitario", render: (s: SaleWithOwner) => formatPrice(s.unit_price) },
              {
                header: "Total",
                render: (s: SaleWithOwner) => formatPrice(s.quantity * s.unit_price),
              },
              {
                header: "Fecha",
                render: (s: SaleWithOwner) => formatDateLong(new Date(s.sold_at)),
              },
              {
                header: "",
                align: "right",
                render: (s: SaleWithOwner) => (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEdit(s)}
                      className="text-on-surface-variant hover:text-primary"
                      aria-label="Editar"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    {role === "ADMIN" ? (
                      <button
                        onClick={() => handleDelete(s)}
                        className="text-on-surface-variant hover:text-error"
                        aria-label="Eliminar"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    ) : null}
                  </div>
                ),
              },
            ]}
            rows={sales}
            getRowKey={(s) => s.id}
            emptyMessage={
              search ? "No se encontraron resultados." : "Aún no hay ventas registradas."
            }
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar venta" : "Nueva venta"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label={entityLabel.replace(/s$/, "")}
            required
            value={form.owner_id}
            onChange={(e) => setForm({ ...form, owner_id: e.target.value })}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </Select>
          <Input
            label="Artículo"
            required
            value={form.item_name}
            onChange={(e) => setForm({ ...form, item_name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cantidad"
              type="number"
              min={1}
              required
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            />
            <Input
              label="Precio unitario"
              type="number"
              min={0}
              step="0.01"
              required
              value={form.unit_price}
              onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })}
            />
          </div>
          <Input
            label="Fecha"
            type="date"
            required
            value={form.sold_at}
            onChange={(e) => setForm({ ...form, sold_at: e.target.value })}
          />
          <Input
            label="Notas"
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          {error ? <p className="text-label-sm text-error">{error}</p> : null}
          <Button type="submit" loading={saving}>
            Guardar
          </Button>
        </form>
      </Modal>
    </div>
  );
}
