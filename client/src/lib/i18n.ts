const translations = {
  common: {
    dashboard: "Panel",
    customers: "Clientes",
    sales: "Ventas",
    integrations: "Integraciones",
    save: "Guardar",
    cancel: "Cancelar",
    edit: "Editar",
    delete: "Eliminar",
    loading: "Cargando...",
    error: "Error",
    success: "Éxito",
    noData: "No hay datos disponibles",
  },
  customers: {
    newCustomer: "Nuevo Cliente",
    name: "Nombre",
    email: "Correo",
    phone: "Teléfono",
    whatsapp: "WhatsApp",
    address: "Dirección",
    notes: "Notas",
  },
  sales: {
    newSale: "Nueva Venta",
    amount: "Monto",
    status: "Estado",
    paymentMethod: "Método de Pago",
    customer: "Cliente",
    pending: "Pendiente",
    completed: "Completada",
    cancelled: "Cancelada",
  },
  integrations: {
    whatsapp: "WhatsApp Business",
    slack: "Slack",
    zapier: "Zapier",
    configure: "Configurar",
    webhooks: "Webhooks",
    addWebhook: "Agregar Webhook",
  }
};

export type TranslationKey = keyof typeof translations;

export function t(key: string): string {
  const keys = key.split(".");
  let current: any = translations;
  
  for (const k of keys) {
    if (current[k] === undefined) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    current = current[k];
  }
  
  return current;
}

export default translations;
