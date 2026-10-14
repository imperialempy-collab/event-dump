import { useState } from 'react';
import { db } from '../firebase/config';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { REGLAS_APP, ESTADOS_ALBUM } from '../constants/reglas';

export const useAlbum = () => {
  const [cargando, setCargando] = useState(false);

  // 1. Función para crear un álbum nuevo (Por defecto nace en TRIAL)
  const crearAlbum = async (creadorId, fechaEventoStr, configuracionCliente) => {
    setCargando(true);
    try {
      // Calculamos que se borre en 24 horas si no paga
      const fechaExpiracion = new Date();
      fechaExpiracion.setHours(fechaExpiracion.getHours() + REGLAS_APP.TRIAL_LIMITES.HORAS_AUTODESTRUCCION);

      const nuevoAlbumRef = doc(collection(db, 'albums'));
      
      const datosAlbum = {
        id: nuevoAlbumRef.id,
        creadorId: creadorId,
        fechaEvento: fechaEventoStr,
        estado: ESTADOS_ALBUM.TRIAL,
        fechaExpiracion: fechaExpiracion.toISOString(),
        configuracion: {
          permiteDescargas: configuracionCliente.permiteDescargas ?? true,
          soloCamara: configuracionCliente.soloCamara ?? false, // Bloquea galería si es true
          permiteComentarios: configuracionCliente.permiteComentarios ?? true,
          permiteLikes: configuracionCliente.permiteLikes ?? true,
          tieneRetos: configuracionCliente.tieneRetos ?? true,
          audiosPublicos: configuracionCliente.audiosPublicos ?? false,
          juezRetosId: configuracionCliente.juezRetosId ?? null, // Nulo = automático
        },
        contadores: {
          fotos: 0,
          historias: 0,
          audios: 0,
          retos: 0
        },
        creadoEn: new Date().toISOString()
      };

      await setDoc(nuevoAlbumRef, datosAlbum);
      setCargando(false);
      return datosAlbum;
    } catch (error) {
      console.error("Error creando el álbum:", error);
      setCargando(false);
      throw error;
    }
  };

  // 2. Función para leer el álbum cuando el invitado escanea el QR
  const obtenerAlbum = async (albumId) => {
    try {
      const docRef = doc(db, 'albums', albumId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        throw new Error("El álbum no existe o ya se autodestruyó.");
      }
    } catch (error) {
      console.error("Error obteniendo álbum:", error);
      throw error;
    }
  };

  // 3. Función CRÍTICA: Verifica si puede subir (Revisa límites del TRIAL)
  const puedeSubirAccion = (album, tipoAccion) => {
    // Si ya pagó, tiene vía libre infinita
    if (album.estado === ESTADOS_ALBUM.PAGADO) return true;

    // Si es TRIAL, revisamos los contadores
    const limites = REGLAS_APP.TRIAL_LIMITES;
    if (tipoAccion === 'FOTO' && album.contadores.fotos >= limites.FOTOS) return false;
    if (tipoAccion === 'HISTORIA' && album.contadores.historias >= limites.HISTORIAS) return false;
    if (tipoAccion === 'AUDIO' && album.contadores.audios >= limites.AUDIOS) return false;
    if (tipoAccion === 'RETO' && album.contadores.retos >= limites.RETOS) return false;

    return true; // Si no superó el límite, le damos permiso
  };

  return { crearAlbum, obtenerAlbum, puedeSubirAccion, cargando };
};