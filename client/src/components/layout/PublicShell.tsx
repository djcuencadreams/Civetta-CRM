import { Link } from "wouter";

/**
 * PublicShell proporciona un layout simplificado para páginas públicas
 * sin la barra lateral y otros elementos del CRM
 */
interface PublicShellProps {
  children: React.ReactNode;
}

export function PublicShell({ children }: PublicShellProps) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header público simplificado */}
      <header className="bg-primary text-primary-foreground py-3 px-6 border-b">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <span className="font-semibold text-lg">CIVETTA CRM</span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            {/* Espacio para ThemeToggle si se implementa después */}
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 p-6 md:p-8">
        <div className="container mx-auto">
          {children}
        </div>
      </main>

      {/* Footer simple */}
      <footer className="bg-muted py-4 mt-auto border-t text-center text-sm text-muted-foreground">
        <div className="container mx-auto">
          <p>© {currentYear} Civetta CRM. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}