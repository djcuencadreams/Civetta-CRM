import { db } from '@db';
import { customers, leads, sales, leadActivities, webhooks } from '@db/schema';
import { writeFile } from 'fs/promises';
import { join } from 'path';

class BackupService {
  private backupDir: string;

  constructor() {
    this.backupDir = join(process.cwd(), 'backups');
  }

  private async ensureBackupDirectory() {
    try {
      await writeFile(join(this.backupDir, '.keep'), '');
    } catch (error) {
      // Si el directorio ya existe, está bien
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  private async backupTable(tableName: string, data: any[]) {
    try {
      if (!data.length) {
        console.log(`No hay datos para respaldar en ${tableName}`);
        return;
      }

      console.log(`Respaldando datos de ${tableName}...`);

      // Convertir datos a CSV
      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            if (value instanceof Date) return value.toISOString();
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ];

      const fileName = `${tableName}_${new Date().toISOString().split('T')[0]}.csv`;
      const filePath = join(this.backupDir, fileName);

      await writeFile(filePath, csvRows.join('\n'));
      console.log(`Backup de ${tableName} guardado en ${filePath}`);

      return filePath;
    } catch (error) {
      console.error(`Error al respaldar ${tableName}:`, error);
      throw error;
    }
  }

  async performBackup() {
    try {
      console.log('Iniciando respaldo de datos...');
      await this.ensureBackupDirectory();

      const backupFiles = [];

      // Respaldar clientes
      const customersData = await db.select().from(customers);
      const customersFile = await this.backupTable('customers', customersData);
      if (customersFile) backupFiles.push(customersFile);

      // Respaldar prospectos
      const leadsData = await db.select().from(leads);
      const leadsFile = await this.backupTable('leads', leadsData);
      if (leadsFile) backupFiles.push(leadsFile);

      // Respaldar ventas
      const salesData = await db.select().from(sales);
      const salesFile = await this.backupTable('sales', salesData);
      if (salesFile) backupFiles.push(salesFile);

      // Respaldar actividades
      const activitiesData = await db.select().from(leadActivities);
      const activitiesFile = await this.backupTable('activities', activitiesData);
      if (activitiesFile) backupFiles.push(activitiesFile);

      // Respaldar webhooks
      const webhooksData = await db.select().from(webhooks);
      const webhooksFile = await this.backupTable('webhooks', webhooksData);
      if (webhooksFile) backupFiles.push(webhooksFile);

      console.log('Respaldo completado exitosamente');
      return {
        success: true,
        backupFiles,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error durante el respaldo:', error);
      throw error;
    }
  }
}

export const backupService = new BackupService();