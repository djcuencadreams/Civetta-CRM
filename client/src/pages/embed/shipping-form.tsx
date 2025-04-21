
import React from 'react';
import { ShippingLabelForm } from '../../components/shipping/ShippingLabelForm';
import { EmbedShell } from '../../components/layout/EmbedShell';

export default function ShippingFormPage() {
  return (
    <EmbedShell>
      <div className="container mx-auto py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6 text-center">Formulario de Envío</h1>
        <ShippingLabelForm />
      </div>
    </EmbedShell>
  );
}
