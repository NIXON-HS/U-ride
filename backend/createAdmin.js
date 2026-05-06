const pool = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
   try {
      console.log("Inyectando Super Administrador Secreto...");
      const passwordCifrada = await bcrypt.hash('seguridad123', 10);
      
      const sql = `
         INSERT INTO usuarios (nombre, email, password_hash, rol) 
         VALUES ('Admin', 'admi@uta.edu.ec', $1, 'ADMINISTRADOR')
         ON CONFLICT (email) DO NOTHING
      `;
      
      await pool.query(sql, [passwordCifrada]);
      console.log("✅ Acceso garantizado a la base de datos.");
      console.log("------------------------------------------");
      console.log("Credenciales de la Plataforma Web:");
      console.log("Usuario: admi@uta.edu.ec");
      console.log("Password: seguridad123");
      console.log("------------------------------------------");
   } catch(e) {
      console.log("Error creando admin:", e);
   } finally {
      process.exit();
   }
}

seedAdmin();
