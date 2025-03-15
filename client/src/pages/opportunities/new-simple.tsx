import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function OpportunitiesNew() {
  const [_, navigate] = useLocation();

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate('/opportunities')} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold">Nueva Oportunidad</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de la Oportunidad</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Estamos trabajando en este formulario. Pronto estará disponible.
          </p>
          <Button 
            onClick={() => navigate('/opportunities')}
            className="mt-4"
          >
            Volver al Pipeline
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}