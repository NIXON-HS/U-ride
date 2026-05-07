require('dotenv').config({ override: true });
const pool = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
   try {
      console.log("\n🔐 Creando usuario administrador...\n");
      
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      const adminName = process.env.ADMIN_NAME;

      if (!adminEmail || !adminPassword || !adminName) {
         throw new Error('Faltan variables ADMIN_EMAIL, ADMIN_PASSWORD o ADMIN_NAME en el .env');
      }
      
      const passwordCifrada = await bcrypt.hash(adminPassword, 10);

      const existingAdmin = await pool.query(
         'SELECT id FROM usuarios WHERE rol = $1 LIMIT 1',
         ['ADMINISTRADOR']
      );

      let result;

      if (existingAdmin.rows.length > 0) {
         result = await pool.query(
            `UPDATE usuarios
             SET nombre = $1,
                 email = $2,
                 password_hash = $3,
                 activo = $4,
                 rol = $5
             WHERE id = $6
             RETURNING id, nombre, email, rol, creado_en`,
            [adminName, adminEmail, passwordCifrada, true, 'ADMINISTRADOR', existingAdmin.rows[0].id]
         );
      } else {
         result = await pool.query(
            `INSERT INTO usuarios (nombre, email, password_hash, rol, activo)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, nombre, email, rol, creado_en`,
            [adminName, adminEmail, passwordCifrada, 'ADMINISTRADOR', true]
         );
      }

      const admin = result.rows[0];
      console.log(existingAdmin.rows.length > 0
         ? '✅ Administrador actualizado exitosamente'
         : '✅ Administrador creado exitosamente');
      console.log("------------------------------------------");
      console.log("📋 Detalles:");
      console.log(`   ID: ${admin.id}`);
      console.log(`   Nombre: ${admin.nombre}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Rol: ${admin.rol}`);
      console.log("------------------------------------------");
      console.log("🔑 Credenciales de acceso:");
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Contraseña: ${adminPassword}`);
      console.log("------------------------------------------");
      console.log("⚠️  IMPORTANTE: Cambia esta contraseña después del primer acceso\n");
   } catch(e) {
      console.error("❌ Error creando admin:", e.message);
   } finally {
      process.exit();
   }
}

seedAdmin();
