import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

// Envuelve toda pantalla interna (Dashboard, Clientes, Agenda...) con el
// mismo sidebar + navbar — el patrón que se repetía en 10 de los 17
// mockups originales (ver docs/arquitectura.md).
export function AppLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-container-max mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
