const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

// Se ejecuta automáticamente cada 1 hora en los servidores de Google
exports.autodestruccionAlbums = onSchedule("every 1 hours", async (event) => {
  const ahora = new Date().toISOString();
  console.log("Iniciando barrido de autodestrucción. Hora actual:", ahora);

  try {
    // Buscar álbumes cuya fecha de expiración ya pasó (Tanto de TRIAL de 24hs como PAGADOS de 5 días)
    const snapshot = await db.collection("albums").where("fechaExpiracion", "<=", ahora).get();
    
    if (snapshot.empty) {
      console.log("No hay álbumes vencidos para eliminar.");
      return;
    }

    const batch = db.batch();
    const promesasStorage = [];

    for (const doc of snapshot.docs) {
      const albumId = doc.id;
      console.log(`Ejecutando autodestrucción del álbum: ${albumId}`);

      // 1. Borrar todos los archivos pesados (Fotos, Historias, Audios) del Storage
      const bucket = storage.bucket();
      const prefix = `albums/${albumId}/`;
      
      promesasStorage.push(
        bucket.deleteFiles({ prefix: prefix })
          .then(() => console.log(`Archivos multimedia de ${albumId} borrados.`))
          .catch(err => console.error(`Error borrando archivos de ${albumId}:`, err))
      );

      // 2. Borrar la subcolección 'multimedia' (cronología, likes, etc.) en la base de datos
      const multimediaSnap = await db.collection(`albums/${albumId}/multimedia`).get();
      multimediaSnap.forEach((mediaDoc) => {
        batch.delete(mediaDoc.ref);
      });

      // 3. Borrar el documento principal del álbum
      batch.delete(doc.ref);
    }

    // Ejecutar el borrado masivo
    await Promise.all(promesasStorage);
    await batch.commit();

    console.log(`Barrido completo. ${snapshot.size} álbumes destruidos sin dejar rastro.`);
  } catch (error) {
    console.error("Error crítico en el cron job de autodestrucción:", error);
  }
});