import { useState } from 'react';
import { db } from '../firebase/config';
import { collection, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { REGLAS_APP, ESTADOS_ALBUM } from '../constants/reglas';
import { RETOS_POR_DEFECTO } from '../constants/retosBase';

export const useAlbum = () => {
  const [cargando, setCargando] = useState(false);

  // 1. Función para crear un álbum nuevo (Por defecto nace en TRIAL)
  const crearAlbum = async (creadorId, fechaEventoStr, configuracionCliente) => {
    setCargando(true);
    try {
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
          soloCamara: configuracionCliente.soloCamara ?? false,
          permiteComentarios: configuracionCliente.permiteComentarios ?? true,
          permiteLikes: configuracionCliente.permiteLikes ?? true,
          tieneRetos: configuracionCliente.tieneRetos ?? true,
          audiosPublicos: configuracionCliente.audiosPublicos ?? false,
          juezRetosId: configuracionCliente.juezRetosId ?? null,
        },
        contadores: {
          fotos: 0,
          historias: 0,
          audios: 0,
          retos: 0
        },
        listaRetos: RETOS_POR_DEFECTO, // <-- Inyectamos la lista de 30 retos aquí
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

  // 3. Función CRÍTICA: Verifica si puede subir
  const puedeSubirAccion = (album, tipoAccion) => {
    if (album.estado === ESTADOS_ALBUM.PAGADO) return true;

    const limites = REGLAS_APP.TRIAL_LIMITES;
    if (tipoAccion === 'FOTO' && album.contadores.fotos >= limites.FOTOS) return false;
    if (tipoAccion === 'HISTORIA' && album.contadores.historias >= limites.HISTORIAS) return false;
    if (tipoAccion === 'AUDIO' && album.contadores.audios >= limites.AUDIOS) return false;
    if (tipoAccion === 'RETO' && album.contadores.retos >= limites.RETOS) return false;

    return true;
  };

  // 4. NUEVA FUNCIÓN: Actualizar lista de retos (Para el panel de configuración)
  const actualizarRetos = async (albumId, nuevaListaRetos) => {
    try {
      const docRef = doc(db, 'albums', albumId);
      await updateDoc(docRef, { listaRetos: nuevaListaRetos });
      return true;
    } catch (error) {
      console.error("Error actualizando retos:", error);
      throw error;
    }
  };

  return { crearAlbum, obtenerAlbum, puedeSubirAccion, actualizarRetos, cargando };
};