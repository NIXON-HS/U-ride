const pool = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
   try {
      console.log("Inyectando Super Administrador Secreto...");
      
      // Usar variables de entorno para las credenciales
      const adminEmail = process.env.ADMIN_EMAIL || 'admi@uta.edu.ec';
      const adminPassword = process.env.ADMIN_PASSWORD || 'seguridad123';
      const adminName = process.env.ADMIN_NAME || 'Admin';
      
      const passwordCifrada = await bcrypt.hash(adminPassword, 10);
      
      const sql = `
         INSERT INTO usuarios (nombre, email, password_hash, rol) 
         VALUES ($1, $2, $3, 'ADMINISTRADOR')
         ON CONFLICT (email) DO NOTHING
      `;
      
      await pool.query(sql, [adminName, adminEmail, passwordCifrada]);
      console.log("✅ Acceso garantizado a la base de datos.");
      console.log("------------------------------------------");
      console.log("Credenciales de la Plataforma Web:");
      console.log("Usuario: " + adminEmail);
      console.log("(Contraseña: configurada desde variables de entorno)");
      console.log("------------------------------------------");
   } catch(e) {
      console.log("Error creando admin:", e);
   } finally {
      process.exit();
   }
}

seedAdmin();
