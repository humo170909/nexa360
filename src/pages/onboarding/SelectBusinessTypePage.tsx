import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BUSINESS_TYPES } from "../../config/businessTypes";
import type { BusinessType } from "../../types/company";
import { useAuth } from "../../hooks/useAuth";
import { useCompany } from "../../hooks/useCompany";
import { createCompany } from "../../services/companies";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

export function SelectBusinessTypePage() {
  const { user } = useAuth();
  const { refetch } = useCompany();
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState("");
  const [selected, setSelected] = useState<BusinessType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = Boolean(selected && companyName.trim() && user);

  async function handleContinue() {
    if (!canContinue || !user || !selected) return;
    setLoading(true);
    setError(null);
    const { error } = await createCompany(companyName.trim(), selected, user.id);
    setLoading(false);
    if (error) {
      // El detalle técnico ya queda en la consola (ver createCompany en
      // services/companies.ts) — aquí solo mostramos un mensaje amigable.
      setError("No se pudo crear la empresa. Intenta de nuevo.");
      return;
    }
    await refetch();
    navigate("/dashboard");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-surface-bright p-4 sm:p-6 md:p-16">
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
        <div className="flex flex-col items-center w-full mb-12 text-center">
          <div className="text-headline-sm font-black text-primary tracking-tight mb-12 uppercase">
            NEXA360
          </div>
          <h1 className="text-display-lg text-primary mb-2">
            Configura tu espacio de trabajo
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-2xl">
            Cuéntanos sobre tu negocio para adaptar la plataforma.
          </p>
        </div>

        <div className="w-full max-w-md mb-12">
          <Input
            label="Nombre de tu empresa"
            placeholder="Ej. Óptica Vision"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full mb-12">
          {Object.values(BUSINESS_TYPES).map((type) => {
            const isSelected = selected === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelected(type.id)}
                className={`flex flex-col items-center justify-center p-8 bg-surface-container-lowest border rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  isSelected
                    ? "border-primary bg-surface-container-low shadow-sm"
                    : "border-outline-variant hover:border-primary/40"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[32px] mb-4 transition-colors ${
                    isSelected ? "text-primary" : "text-on-surface-variant"
                  }`}
                >
                  {type.icon}
                </span>
                <span className="text-label-md text-on-surface text-center">
                  {type.label}
                </span>
              </button>
            );
          })}
        </div>

        {error ? <p className="text-label-sm text-error mb-4">{error}</p> : null}

        <Button
          fullWidth={false}
          disabled={!canContinue}
          loading={loading}
          onClick={handleContinue}
        >
          Continuar
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Button>
      </div>
    </main>
  );
}
