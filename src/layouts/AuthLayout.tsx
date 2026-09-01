import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  variant?: "split" | "centered";
  title: string;
  subtitle: string;
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center">
        <span className="material-symbols-outlined text-[18px]">hub</span>
      </div>
      <span className="text-headline-md font-bold text-primary">NEXA360</span>
    </div>
  );
}

export function AuthLayout({ children, variant = "split", title, subtitle }: AuthLayoutProps) {
  if (variant === "centered") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-4 md:p-12">
        <div className="w-full max-w-md">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-6 md:p-8 flex flex-col gap-8">
            <div className="flex flex-col items-center text-center gap-4">
              <h1 className="text-headline-md text-primary">{title}</h1>
              <p className="text-body-sm text-on-surface-variant">{subtitle}</p>
            </div>
            {children}
          </div>
          <div className="text-center mt-6">
            <Brand />
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo de marca — oculto en mobile */}
      <div className="hidden lg:flex lg:flex-1 bg-primary-container relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-between h-full p-16 w-full max-w-2xl text-on-primary">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-3xl">hub</span>
            <span className="text-headline-md font-bold tracking-tight">NEXA360</span>
          </div>
          <div className="mb-12 space-y-4">
            <h2 className="text-display-lg leading-tight">
              Una plataforma. <br />
              <span className="text-on-primary/70">Todos tus servicios.</span>
            </h2>
            <p className="text-body-lg text-on-primary/80 max-w-sm">
              Gestiona clientes, citas, servicios y automatizaciones desde un
              solo lugar.
            </p>
          </div>
        </div>
      </div>

      {/* Panel derecho: formulario */}
      <div className="w-full lg:flex-1 flex items-center justify-center p-4 sm:p-12 bg-surface-container-lowest overflow-y-auto">
        <div className="w-full max-w-md space-y-8">
          <div className="flex lg:hidden justify-center mb-6">
            <Brand />
          </div>
          <div className="text-center lg:text-left">
            <h1 className="text-headline-lg text-on-surface mb-2">{title}</h1>
            <p className="text-body-md text-on-surface-variant">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
