import React, { useState } from 'react';

/**
 * Componente de diagnóstico para verificar la interactividad de UI
 * Se puede insertar en cualquier página para asegurar que los eventos de clic funcionan correctamente
 */
export function PointerEventsTest() {
  const [clicked, setClicked] = useState(false);
  const [count, setCount] = useState(0);
  
  const handleClick = () => {
    setClicked(true);
    setCount(prev => prev + 1);
  };
  
  return (
    <div className="p-4 border rounded-md bg-blue-50 max-w-md mx-auto my-4">
      <h3 className="text-lg font-medium mb-2">Test de Interactividad UI</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Este componente verifica si los eventos de clic están funcionando correctamente.
      </p>
      
      <button
        onClick={handleClick}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Haz clic aquí para probar
      </button>
      
      {clicked && (
        <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-md">
          <p>✅ La interactividad funciona correctamente</p>
          <p className="text-sm">Has hecho clic {count} {count === 1 ? 'vez' : 'veces'}.</p>
        </div>
      )}
    </div>
  );
}

export default PointerEventsTest;