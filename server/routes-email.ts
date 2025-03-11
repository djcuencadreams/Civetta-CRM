/**
 * Rutas de API para la configuración del servicio de email
 */

import { Request, Response } from 'express';
import { 
  getEmailConfig, 
  updateEmailConfig, 
  sendTemplateEmail, 
  ensureEmailTemplateDirectories
} from './lib/email.service';

/**
 * Registra las rutas para la configuración de email
 * @param app Aplicación Express
 */
export function registerEmailRoutes(app: any) {
  // Obtener la configuración actual del servicio de email
  app.get('/api/configuration/email', (_req: Request, res: Response) => {
    try {
      const config = getEmailConfig();
      res.json(config);
    } catch (error) {
      console.error('Error al obtener la configuración de email:', error);
      res.status(500).json({ error: 'Error al obtener la configuración de email' });
    }
  });

  // Actualizar la configuración del servicio de email
  app.post('/api/configuration/email', async (req: Request, res: Response) => {
    try {
      const { 
        provider, 
        sendgridApiKey, 
        emailFrom, 
        smtpHost, 
        smtpPort, 
        smtpUser, 
        smtpPass,
        enabled,
        welcomeEmailEnabled,
        orderConfirmationEnabled
      } = req.body;

      // Validar que tengamos datos mínimos según el proveedor
      if (provider === 'sendgrid' && !sendgridApiKey) {
        return res.status(400).json({ error: 'Se requiere una clave API de SendGrid' });
      }

      if (provider === 'smtp' && (!smtpHost || !smtpUser || !smtpPass)) {
        return res.status(400).json({ error: 'Se requieren host, usuario y contraseña SMTP' });
      }

      // Asegurarse de que el puerto SMTP sea un número
      let parsedSmtpPort = smtpPort;
      if (smtpPort && typeof smtpPort === 'string') {
        parsedSmtpPort = parseInt(smtpPort);
        if (isNaN(parsedSmtpPort)) {
          return res.status(400).json({ error: 'El puerto SMTP debe ser un número' });
        }
      }

      // Validar que provider sea un valor permitido
      if (provider && !['sendgrid', 'smtp'].includes(provider)) {
        return res.status(400).json({ error: 'Proveedor de email no válido' });
      }

      // Actualizar la configuración
      const updatedConfig = updateEmailConfig({
        provider: provider as 'sendgrid' | 'smtp',
        sendgridApiKey,
        emailFrom,
        smtpHost,
        smtpPort: parsedSmtpPort,
        smtpUser,
        smtpPass,
        enabled: enabled !== undefined ? enabled : true,
        welcomeEmailEnabled: welcomeEmailEnabled !== undefined ? welcomeEmailEnabled : true,
        orderConfirmationEnabled: orderConfirmationEnabled !== undefined ? orderConfirmationEnabled : true
      });

      // Retornar la configuración actualizada (sin credenciales sensibles)
      const safeConfig = getEmailConfig();
      res.json(safeConfig);

    } catch (error) {
      console.error('Error al actualizar la configuración de email:', error);
      res.status(500).json({ error: 'Error al actualizar la configuración de email' });
    }
  });

  // Enviar un email de prueba
  app.post('/api/configuration/email/test', async (req: Request, res: Response) => {
    try {
      const { to, subject, template } = req.body;

      if (!to) {
        return res.status(400).json({ error: 'Se requiere una dirección de email de destino' });
      }

      // Validar dirección de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        return res.status(400).json({ error: 'Dirección de email inválida' });
      }

      // Asegurarse de que existan los directorios de plantillas
      ensureEmailTemplateDirectories();

      // Contenido de prueba para las plantillas
      const testData = {
        name: 'Usuario de Prueba',
        email: to,
        date: new Date().toLocaleDateString(),
        orderNumber: '12345',
        items: [
          { quantity: 1, productName: 'Producto de Prueba', unitPrice: 100, subtotal: 100 }
        ],
        total: 100,
        status: 'new'
      };

      // Enviar email de prueba usando la plantilla especificada
      const result = await sendTemplateEmail(
        to,
        template || 'welcome',
        testData,
        { subject: subject || 'Email de prueba' }
      );

      if (result.success) {
        res.json({ success: true, message: 'Email de prueba enviado correctamente' });
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'Error al enviar el email de prueba', 
          details: result.error 
        });
      }
    } catch (error) {
      console.error('Error al enviar email de prueba:', error);
      res.status(500).json({ error: 'Error al enviar email de prueba' });
    }
  });
}