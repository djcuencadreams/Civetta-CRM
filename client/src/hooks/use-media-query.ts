import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  // Valor por defecto cuando estamos en SSR o no hay ventana
  const getMatches = (): boolean => {
    // Verificar si estamos en un entorno que admite window
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  // Estado inicial basado en el valor actual
  const [matches, setMatches] = useState<boolean>(getMatches());

  // Efecto para manejar cambios y hacer limpieza
  useEffect(() => {
    // Verificar si estamos en un entorno que admite window
    if (typeof window === 'undefined') {
      return undefined;
    }

    // Crear el objeto MediaQueryList
    const mediaQuery = window.matchMedia(query);
    
    // Establecer el estado inicial (por seguridad)
    setMatches(mediaQuery.matches);
    
    // Definir la función de callback para los cambios en el MediaQueryList
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    
    // Agregar el listener para cambios
    mediaQuery.addEventListener('change', handleChange);
    
    // Limpiar el listener cuando el componente se desmonte
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}

export function useBreakpoint(): string {
  const isSm = useMediaQuery('(min-width: 640px)');
  const isMd = useMediaQuery('(min-width: 768px)');
  const isLg = useMediaQuery('(min-width: 1024px)');
  const isXl = useMediaQuery('(min-width: 1280px)');
  const is2xl = useMediaQuery('(min-width: 1536px)');

  if (is2xl) return '2xl';
  if (isXl) return 'xl';
  if (isLg) return 'lg';
  if (isMd) return 'md';
  if (isSm) return 'sm';
  return 'xs';
}