import { useState, useEffect } from 'react';

/**
 * Categoría del dispositivo
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * Hook para detectar el tipo de dispositivo y su orientación
 * @returns Objeto con información del dispositivo
 */
export function useDeviceInfo() {
  const [deviceInfo, setDeviceInfo] = useState<{
    deviceType: DeviceType;
    isPortrait: boolean;
    viewportWidth: number;
    viewportHeight: number;
  }>({
    deviceType: 'desktop',
    isPortrait: false,
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1024,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 768
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;

      // Definir tipo de dispositivo basado en el ancho de la pantalla
      let deviceType: DeviceType = 'desktop';
      if (width < 640) {
        deviceType = 'mobile';
      } else if (width < 1024) {
        deviceType = 'tablet';
      }

      setDeviceInfo({
        deviceType,
        isPortrait,
        viewportWidth: width,
        viewportHeight: height
      });
    };

    // Actualizar al inicio
    updateDeviceInfo();

    // Actualizar al cambiar el tamaño de la ventana
    window.addEventListener('resize', updateDeviceInfo);

    // Actualizar al cambiar la orientación (específico para dispositivos móviles)
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}

/**
 * Hook simplificado para detectar si el dispositivo es móvil
 */
export function useIsMobile(): boolean {
  const { deviceType } = useDeviceInfo();
  return deviceType === 'mobile';
}