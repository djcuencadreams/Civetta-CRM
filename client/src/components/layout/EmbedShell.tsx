/**
 * EmbedShell proporciona un layout minimal para páginas embebibles
 * sin cabecera, pie de página, ni barra lateral
 */
interface EmbedShellProps {
  children: React.ReactNode;
}

export function EmbedShell({ children }: EmbedShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <main className="w-full">
        {children}
      </main>
    </div>
  );
}