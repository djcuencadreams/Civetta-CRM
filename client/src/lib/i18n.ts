const translations = {
  common: {
    dashboard: "Panel",
    customers: "Clientes",
    sales: "Ventas",
    orders: "Pedidos",
    leads: "Leads",
    products: "Productos",
    reports: "Informes",
    integrations: "Integraciones",
    configuration: "Configuración",
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
  },
  orders: {
    newOrder: "Nuevo Pedido",
    orderNumber: "Número de Pedido",
    customer: "Cliente",
    totalAmount: "Monto Total",
    status: "Estado",
    paymentStatus: "Estado de Pago",
    paymentMethod: "Método de Pago",
    source: "Origen",
    brand: "Marca",
    createdAt: "Fecha de Creación",
    items: "Artículos",
    preparing: "Preparando",
    shipped: "Enviado",
    completed: "Completado",
    cancelled: "Cancelado",
    new: "Nuevo",
    paid: "Pagado",
    pending: "Pendiente",
    refunded: "Reembolsado"
  },
  products: {
    newProduct: "Nuevo Producto",
    name: "Nombre",
    sku: "SKU",
    description: "Descripción",
    price: "Precio",
    stock: "Inventario",
    active: "Activo",
    inactive: "Inactivo",
    brand: "Marca",
    category: "Categoría",
    inventory: "Inventario",
    status: "Estado",
    actions: "Acciones"
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
