import { useState, useEffect } from 'react';

/**
 * Hook simplificado para detectar si el dispositivo es móvil
 * Basado en el ancho de la pantalla (< 640px)
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateIsMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    // Actualizar al inicio
    updateIsMobile();

    // Actualizar cuando cambie el tamaño de la ventana
    window.addEventListener('resize', updateIsMobile);

    return () => {
      window.removeEventListener('resize', updateIsMobile);
    };
  }, []);

  return isMobile;
}