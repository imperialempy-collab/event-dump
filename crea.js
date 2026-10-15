const { execSync } = require('child_process');

console.log("⏳ Creando punto de control (Backup) en GitHub...");

try {
  // Generamos un nombre único usando la fecha para no sobreescribir backups anteriores
  const nombreRama = `backup-estable-${Date.now()}`;
  
  // 1. Nos aseguramos de guardar cualquier cambio pendiente en tu rama actual (main)
  try {
    execSync('git add .');
    execSync('git commit -m "Guardado de seguridad previo a backup"');
    execSync('git push origin main');
  } catch (e) {
    // Si no hay nada nuevo que guardar, Git tira un error inofensivo, lo ignoramos.
  }

  // 2. Creamos una rama nueva exacta a tu código actual (Sin movernos de main)
  execSync(`git branch ${nombreRama}`);
  
  // 3. Empujamos esa rama nueva a GitHub
  execSync(`git push origin ${nombreRama}`, { stdio: 'inherit' });
  
  console.log(`\n✅ ¡BACKUP EXITOSO!`);
  console.log(`Tu código actual se ha congelado en la nube bajo la rama: ${nombreRama}`);
  console.log(`Tu aplicación sigue conectada a 'main', así que puedes seguir trabajando normalmente.`);
  
} catch (error) {
  console.error("Hubo un error creando el backup:", error.message);
}