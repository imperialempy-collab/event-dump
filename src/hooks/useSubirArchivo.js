import { useState } from 'react';
import { storage, db } from '../firebase/config';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, increment, doc, updateDoc } from 'firebase/firestore';

export const useSubirArchivo = () => {
  const [progreso, setProgreso] = useState(0);
  const [subiendo, setSubiendo] = useState(false);

  // Toma el archivo de la cámara y lo sube a la nube
  const subirArchivo = async (albumId, invitadoNombre, archivoBlob, tipo) => {
    setSubiendo(true);
    setProgreso(0);

    return new Promise((resolve, reject) => {
      const extension = tipo === 'FOTO' ? '.jpg' : '.mp4';
      const nombreArchivo = `${tipo}_${Date.now()}${extension}`;
      const rutaStorage = `albums/${albumId}/${nombreArchivo}`;
      const storageRef = ref(storage, rutaStorage);

      const uploadTask = uploadBytesResumable(storageRef, archivoBlob);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const avance = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgreso(avance); // Para la barra de carga en pantalla
        }, 
        (error) => {
          console.error("Error al subir:", error);
          setSubiendo(false);
          reject(error);
        }, 
        async () => {
          try {
            // Se subió el archivo, pedimos el link de internet
            const urlDescarga = await getDownloadURL(uploadTask.snapshot.ref);

            // Guardamos el link en la base de datos cronológica
            const docRef = await addDoc(collection(db, 'albums', albumId, 'multimedia'), {
              url: urlDescarga,
              tipo: tipo, 
              autor: invitadoNombre,
              creadoEn: new Date().toISOString(),
              likes: 0,
              comentarios: []
            });

            // Sumar +1 al contador de fotos/historias (para límite de Trial)
            const campoContador = tipo === 'FOTO' ? 'contadores.fotos' : 'contadores.historias';
            await updateDoc(doc(db, 'albums', albumId), {
              [campoContador]: increment(1)
            });

            setSubiendo(false);
            setProgreso(100);
            resolve({ url: urlDescarga, id: docRef.id });
          } catch (error) {
            setSubiendo(false);
            reject(error);
          }
        }
      );
    });
  };

  return { subirArchivo, progreso, subiendo };
};