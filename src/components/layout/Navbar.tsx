import { useAuth } from "../../hooks/useAuth";

export function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <header className="flex justify-between items-center w-full px-6 h-16 bg-surface-bright border-b border-outline-variant sticky top-0 z-20 shrink-0">
      <div className="md:hidden text-headline-sm font-black text-primary">NEXA360</div>
      <div className="hidden md:block" />

      <div className="flex items-center gap-4">
        <span className="hidden sm:block text-body-sm text-on-surface-variant">
          {user?.email}
        </span>
        <button
          onClick={signOut}
          className="flex items-center gap-1 text-label-sm text-on-surface-variant hover:text-primary transition-colors px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container-low"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
