import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  data?: any;
}

/**
 * Función utilitaria para hacer peticiones API
 * @param url URL a solicitar
 * @param options Opciones de la petición (method, headers, data)
 * @returns Datos de la respuesta
 */
export async function apiRequest(url: string, options: RequestOptions = {}) {
  const { method = 'GET', headers = {}, data } = options;
  
  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'same-origin',
  };
  
  if (data) {
    fetchOptions.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, fetchOptions);
    
    // Manejo de errores HTTP
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    // Devolver datos JSON o una respuesta vacía si no hay contenido
    if (response.status === 204) {
      return null;
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('API Request Error:', error);
    throw error;
  }
}

/**
 * Función para obtener una función queryFn para TanStack Query
 * @param url URL base para la solicitud
 * @returns QueryFn compatible con useQuery
 */
export function getQueryFn(url: string) {
  return async ({ queryKey }: { queryKey: any[] }) => {
    // Si la URL ya incluye un signo de interrogación, usar & para agregar parámetros
    const separator = url.includes('?') ? '&' : '?';
    
    // Añadir timestamp para evitar caché
    const timestamp = new Date().getTime();
    const finalUrl = `${url}${separator}_=${timestamp}`;
    
    return apiRequest(finalUrl);
  };
}