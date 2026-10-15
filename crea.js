const { execSync } = require('child_process');

console.log("⏳ Creando punto de control (Backup) antes de agregar la linterna...");

try {
  const nombreRama = 'backup-antes-de-linterna';
  
  // 1. Guardar cambios pendientes en main
  try {
    execSync('git add .');
    execSync('git commit -m "Guardado previo a rama backup linterna"');
    execSync('git push origin main');
  } catch (e) {
    // Ignorar si no hay cambios pendientes
  }

  // 2. Crear o cambiar a la rama de backup y enviarla a GitHub
  try {
    execSync(`git checkout -b ${nombreRama}`);
  } catch (e) {
    execSync(`git checkout ${nombreRama}`);
  }
  
  execSync(`git push origin ${nombreRama}`, { stdio: 'inherit' });
  
  // 3. Regresar a la rama principal (main) para continuar trabajando
  execSync('git checkout main');
  
  console.log(`\n✅ ¡BACKUP EXITOSO!`);
  console.log(`Tu versión estable actual ha sido guardada en la rama de respaldo: '${nombreRama}'`);
  console.log(`Continuamos trabajando sobre 'main'.`);
  
} catch (error) {
  console.error("Hubo un error creando el backup:", error.message);
}