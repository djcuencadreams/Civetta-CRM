#!/bin/bash

echo "🧹 Limpiando archivos obsoletos..."
rm -f ./client/src/components/shipping/ShippingLabelForm.tsx.bak
rm -f ./server/routes-shipping-check-customer.ts

echo "📦 Copiando nuevos archivos..."
cp -r ./shipping_form_upgrade_v1/client/* ./client/
cp -r ./shipping_form_upgrade_v1/server/* ./server/

echo "🛠️ Registrando rutas..."
# Asegúrate de que esta línea esté presente en server/index.ts
echo 'import { registerReactShippingRoutes } from "./routes-shipping-react";' >> ./server/index.ts
echo 'registerReactShippingRoutes(app);' >> ./server/index.ts

echo "✅ Instalación completa. Reinicia el servidor para aplicar los cambios."
