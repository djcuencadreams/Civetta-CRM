import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Construir la URL basada en los elementos de queryKey
    let url: string;
    
    if (typeof queryKey[0] === 'string') {
      if (queryKey.length === 1) {
        // Si solo hay un elemento en el queryKey, usarlo como URL completa
        url = queryKey[0];
      } else {
        // Si hay más elementos, construir la URL combinando el endpoint base con los parámetros
        const baseEndpoint = queryKey[0];
        // Convertir cada parámetro a string y unirlos
        const params = queryKey.slice(1).map(param => String(param)).join('/');
        url = `${baseEndpoint}/${params}`;
      }
    } else {
      throw new Error('El primer elemento de queryKey debe ser una cadena');
    }
    
    console.log(`📡 Realizando petición a: ${url}`);
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
