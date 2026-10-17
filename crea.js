const { execSync } = require('child_process');

console.log("⏳ Creando respaldo de seguridad en la rama 'backup-antes-de-ux-definitiva'...");

try {
  execSync('git checkout main');
  execSync('git add .');
  try { execSync('git commit -m "Respaldo previo a UX definitiva de galeria"'); } catch(e){}
  execSync('git push origin main');

  const nombreBackup = 'backup-antes-de-ux-definitiva';
  try {
    execSync(`git branch ${nombreBackup}`);
  } catch(e) {}
  execSync(`git push origin ${nombreBackup}`, { stdio: 'inherit' });
  console.log(`✅ ¡Respaldo creado con éxito en la rama: '${nombreBackup}'!`);
} catch (err) {
  console.error("Error al crear el respaldo:", err.message);
}