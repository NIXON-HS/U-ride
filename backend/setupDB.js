const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const adminConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: 'postgres',
};

async function setupDatabase() {
  console.log("Iniciando inyección de Base de Datos y Tablas (Modo Haversine Nativo)...");
  let adminClient = null;
  let appClient = null;
  
  try {
    adminClient = new Client(adminConfig);
    await adminClient.connect();
    
    await adminClient.query(`
      SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
      WHERE datname = 'uride' AND pid <> pg_backend_pid();
    `).catch(() => {});
    
    await adminClient.query(`DROP DATABASE IF EXISTS uride;`);
    await adminClient.query(`CREATE DATABASE uride;`);
    console.log("✅ Base de datos 'uride' creada con éxito.");
    
  } catch (err) {
    console.error("❌ Error Database General:", err);
  } finally {
    if(adminClient) await adminClient.end();
  }

  try {
    const appConfig = { ...adminConfig, database: 'uride' };
    appClient = new Client(appConfig);
    await appClient.connect();
    
    const schemaPath = path.join(__dirname, 'src/models/schema.sql');
    const sqlScript = fs.readFileSync(schemaPath, 'utf8');
    
    await appClient.query(sqlScript);
    console.log("✅ Tablas, Políticas y Componentes de Arquitectura instalados.");
    console.log("🚀 Lanza tu servidor web con 'npm run dev'!");
  } catch (err) {
     console.error("❌ Fallo en Inyección:", err);
  } finally {
     if(appClient) await appClient.end();
     process.exit(0);
  }
}

setupDatabase();
