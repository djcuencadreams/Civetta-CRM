/**
 * Servicio de email que usa SendGrid o Nodemailer para enviar emails
 * Puede usar tanto SendGrid como Nodemailer según la configuración disponible
 */

import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { log } from '../vite';
import { appEvents, EventTypes } from './event-emitter';

// El módulo nodemailer se usa con tipado 'any' ya que no tiene declaraciones

// Variable para almacenar la configuración de email
interface EmailConfig {
  provider: 'sendgrid' | 'smtp';
  sendgridApiKey?: string;
  emailFrom?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  enabled: boolean;
  welcomeEmailEnabled: boolean;
  orderConfirmationEnabled: boolean;
}

// Interfaz para la configuración segura (sin credenciales sensibles)
interface SafeEmailConfig {
  provider: 'sendgrid' | 'smtp';
  emailFrom?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  enabled: boolean;
  welcomeEmailEnabled: boolean;
  orderConfirmationEnabled: boolean;
  hasSendgridKey?: boolean;
  hasSmtpCredentials?: boolean;
}

// Configuración por defecto
let emailConfig: EmailConfig = {
  provider: 'sendgrid',
  sendgridApiKey: process.env.SENDGRID_API_KEY,
  emailFrom: process.env.EMAIL_FROM || 'noreply@example.com',
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  enabled: false,
  welcomeEmailEnabled: true,
  orderConfirmationEnabled: true
};

// Inicializar la configuración
function initializeEmailService() {
  // Verificar si tenemos las credenciales necesarias para SendGrid
  if (emailConfig.sendgridApiKey) {
    emailConfig.provider = 'sendgrid';
    emailConfig.enabled = true;
    sgMail.setApiKey(emailConfig.sendgridApiKey);
    log('SendGrid initialized with API key', 'email-service');
    return true;
  }
  
  // Verificar si tenemos las credenciales necesarias para SMTP
  if (emailConfig.smtpHost && emailConfig.smtpUser && emailConfig.smtpPass) {
    emailConfig.provider = 'smtp';
    emailConfig.enabled = true;
    log('SMTP initialized with host: ' + emailConfig.smtpHost, 'email-service');
    return true;
  }
  
  log('Email service not configured. Please provide SendGrid API key or SMTP credentials.', 'email-service');
  return false;
}

// Crear un transporter para Nodemailer
function createTransporter() {
  if (emailConfig.provider === 'smtp') {
    return nodemailer.createTransport({
      host: emailConfig.smtpHost,
      port: emailConfig.smtpPort,
      secure: emailConfig.smtpPort === 465, // true para 465, false para otros puertos
      auth: {
        user: emailConfig.smtpUser,
        pass: emailConfig.smtpPass
      }
    });
  }
  return null;
}

// Función para leer las plantillas de email
function getEmailTemplate(templateName: string): string {
  try {
    // Usar import.meta.url en lugar de __dirname para módulos ES
    const currentModulePath = new URL(import.meta.url).pathname;
    const baseDir = path.dirname(path.dirname(path.dirname(currentModulePath)));
    const templatePath = path.join(baseDir, 'templates/emails/', `${templateName}.html`);
    
    // Verificar si el archivo existe, si no, usar una plantilla predeterminada
    if (fs.existsSync(templatePath)) {
      return fs.readFileSync(templatePath, 'utf-8');
    } 
    
    // Plantilla básica en caso de que no exista el archivo
    if (templateName === 'welcome') {
      return `<html>
        <body>
          <h1>¡Bienvenido {{name}}!</h1>
          <p>Gracias por registrarte en nuestro servicio.</p>
          <p>Estamos emocionados de tenerte como parte de nuestra comunidad.</p>
        </body>
      </html>`;
    } 
    
    if (templateName === 'order-confirmation') {
      return `<html>
        <body>
          <h1>Confirmación de Pedido</h1>
          <p>Hola {{name}},</p>
          <p>Tu pedido #{{orderNumber}} ha sido confirmado.</p>
          <h2>Detalles del pedido:</h2>
          <ul>
            {{#each items}}
            <li>{{quantity}}x {{productName}} - ${{subtotal}}</li>
            {{/each}}
          </ul>
          <p><strong>Total: ${{totalAmount}}</strong></p>
          <p>Gracias por tu compra.</p>
        </body>
      </html>`;
    }
    
    // Plantilla genérica para otros tipos
    return `<html>
      <body>
        <h1>{{subject}}</h1>
        <p>{{message}}</p>
      </body>
    </html>`;
  } catch (error) {
    log('Error loading email template: ' + error, 'email-service');
    return `<html>
      <body>
        <h1>{{subject}}</h1>
        <p>{{message}}</p>
      </body>
    </html>`;
  }
}

// Función para renderizar plantillas con Handlebars
function renderTemplate(templateName: string, context: Record<string, any>): string {
  const templateSource = getEmailTemplate(templateName);
  const template = Handlebars.compile(templateSource);
  return template(context);
}

/**
 * Envía un email usando el proveedor configurado (SendGrid o SMTP)
 * 
 * @param to Dirección de email del destinatario
 * @param subject Asunto del email
 * @param bodyHtml Cuerpo del email en formato HTML
 * @param options Opciones adicionales (ej. CC, BCC, etc.)
 * @returns Promise con el resultado del envío
 */
export async function sendEmail(
  to: string,
  subject: string,
  bodyHtml: string,
  options: {
    cc?: string | string[];
    bcc?: string | string[];
    attachments?: any[];
    from?: string;
  } = {}
): Promise<any> {
  if (!emailConfig.enabled) {
    const initialized = initializeEmailService();
    if (!initialized) {
      log('Email service not configured', 'email-service');
      return { success: false, error: 'Email service not configured' };
    }
  }

  try {
    const from = options.from || emailConfig.emailFrom;
    
    if (emailConfig.provider === 'sendgrid') {
      const msg = {
        to,
        from: from || 'noreply@example.com',
        subject,
        html: bodyHtml,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
        content: [
          {
            type: 'text/html',
            value: bodyHtml
          }
        ]
      };
      
      const response = await sgMail.send(msg);
      log(`Email sent to ${to} using SendGrid`, 'email-service');
      return { success: true, response };
    } else if (emailConfig.provider === 'smtp') {
      const transporter = createTransporter();
      if (!transporter) {
        throw new Error('SMTP transporter not configured');
      }
      
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        html: bodyHtml,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments
      });
      
      log(`Email sent to ${to} using SMTP: ${info.messageId}`, 'email-service');
      return { success: true, messageId: info.messageId };
    } else {
      throw new Error('No email provider configured');
    }
  } catch (error) {
    log(`Error sending email: ${error}`, 'email-service');
    return { success: false, error };
  }
}

/**
 * Envía un email usando una plantilla
 * 
 * @param to Dirección de email del destinatario
 * @param templateName Nombre de la plantilla a utilizar
 * @param context Datos para renderizar la plantilla
 * @param options Opciones adicionales (ej. CC, BCC, etc.)
 * @returns Promise con el resultado del envío
 */
export async function sendTemplateEmail(
  to: string,
  templateName: string,
  context: Record<string, any>,
  options: {
    subject?: string;
    cc?: string | string[];
    bcc?: string | string[];
    attachments?: any[];
    from?: string;
  } = {}
): Promise<any> {
  const subject = options.subject || (context.subject || `Mensaje de ${emailConfig.emailFrom}`);
  const htmlContent = renderTemplate(templateName, context);
  return sendEmail(to, subject, htmlContent, options);
}

/**
 * Envía un email de bienvenida a un nuevo lead
 * 
 * @param lead Datos del lead
 * @returns Promise con el resultado del envío
 */
export async function sendWelcomeEmail(lead: any): Promise<any> {
  if (!emailConfig.enabled || !emailConfig.welcomeEmailEnabled || !lead.email) {
    return { success: false, reason: 'Email disabled or lead has no email' };
  }
  
  const context = {
    name: lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
    email: lead.email,
    date: new Date().toLocaleDateString()
  };
  
  return sendTemplateEmail(
    lead.email,
    'welcome',
    context,
    { subject: '¡Bienvenido a nuestra tienda!' }
  );
}

/**
 * Envía un email de confirmación de pedido
 * 
 * @param order Datos del pedido
 * @param customer Datos del cliente
 * @returns Promise con el resultado del envío
 */
export async function sendOrderConfirmationEmail(order: any, customer: any): Promise<any> {
  if (!emailConfig.enabled || !emailConfig.orderConfirmationEnabled || !customer.email) {
    return { success: false, reason: 'Email disabled or customer has no email' };
  }
  
  const context = {
    name: customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
    email: customer.email,
    orderNumber: order.orderNumber || order.id,
    date: new Date(order.createdAt).toLocaleDateString(),
    items: order.items || [],
    totalAmount: order.totalAmount,
    status: order.status
  };
  
  return sendTemplateEmail(
    customer.email,
    'order-confirmation',
    context,
    { subject: `Confirmación de pedido #${context.orderNumber}` }
  );
}

/**
 * Actualiza la configuración del servicio de email
 * 
 * @param newConfig Nueva configuración
 * @returns Configuración actualizada
 */
export function updateEmailConfig(newConfig: Partial<EmailConfig>): EmailConfig {
  emailConfig = { ...emailConfig, ...newConfig };
  
  // Reinicializar el servicio si cambiaron las credenciales
  if (newConfig.sendgridApiKey || newConfig.smtpHost || newConfig.smtpUser || newConfig.smtpPass) {
    initializeEmailService();
  }
  
  return emailConfig;
}

/**
 * Retorna la configuración actual del servicio de email (sin credenciales sensibles)
 * 
 * @returns Configuración actual
 */
export function getEmailConfig(): SafeEmailConfig {
  // Retornar una versión sin credenciales sensibles
  const { sendgridApiKey, smtpPass, ...safeConfig } = emailConfig;
  return {
    ...safeConfig,
    // Añadir indicadores de si las credenciales están configuradas
    hasSendgridKey: !!emailConfig.sendgridApiKey,
    hasSmtpCredentials: !!(emailConfig.smtpHost && emailConfig.smtpUser && emailConfig.smtpPass)
  };
}

// Registrar manejadores de eventos para enviar emails automáticamente
export function registerEmailEventHandlers() {
  // Enviar email de bienvenida cuando se crea un nuevo lead
  appEvents.on(EventTypes.LEAD_CREATED, (lead: any) => {
    if (emailConfig.enabled && emailConfig.welcomeEmailEnabled && lead.email) {
      sendWelcomeEmail(lead)
        .then(result => {
          if (result.success) {
            log(`Welcome email sent to lead ${lead.id} (${lead.email})`, 'email-service');
          } else {
            log(`Failed to send welcome email to lead ${lead.id}: ${result.error}`, 'email-service');
          }
        })
        .catch(error => {
          log(`Error sending welcome email to lead ${lead.id}: ${error}`, 'email-service');
        });
    }
  });

  // Enviar email de confirmación cuando se crea un nuevo pedido
  appEvents.on(EventTypes.ORDER_CREATED, async (order: any) => {
    if (emailConfig.enabled && emailConfig.orderConfirmationEnabled && order.customerId) {
      try {
        // Buscar datos del cliente
        const db = (await import('../../db')).db;
        const { customers } = await import('../../db/schema');
        const { eq } = await import('drizzle-orm');
        const customer = await db.query.customers.findFirst({
          where: eq(customers.id, order.customerId)
        });
        
        if (customer && customer.email) {
          sendOrderConfirmationEmail(order, customer)
            .then(result => {
              if (result.success) {
                log(`Order confirmation email sent for order ${order.id} to ${customer.email}`, 'email-service');
              } else {
                log(`Failed to send order confirmation email for order ${order.id}: ${result.error}`, 'email-service');
              }
            })
            .catch(error => {
              log(`Error sending order confirmation email for order ${order.id}: ${error}`, 'email-service');
            });
        }
      } catch (error) {
        log(`Error preparing order confirmation email for order ${order.id}: ${error}`, 'email-service');
      }
    }
  });
}

// Directorios para plantillas de emails
export function ensureEmailTemplateDirectories() {
  // Usar import.meta.url en lugar de __dirname para módulos ES
  const currentModulePath = new URL(import.meta.url).pathname;
  const baseDir = path.dirname(path.dirname(path.dirname(currentModulePath)));
  const templatesDir = path.join(baseDir, 'templates/emails');
  
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
    
    // Crear plantillas básicas
    const welcomeTemplate = getEmailTemplate('welcome');
    const orderTemplate = getEmailTemplate('order-confirmation');
    
    fs.writeFileSync(path.join(templatesDir, 'welcome.html'), welcomeTemplate);
    fs.writeFileSync(path.join(templatesDir, 'order-confirmation.html'), orderTemplate);
    
    log('Created email template directory and basic templates', 'email-service');
  }
}

// Inicializar el servicio de email
ensureEmailTemplateDirectories();
initializeEmailService();