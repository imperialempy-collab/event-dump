import { useState } from 'react';
import { db } from '../firebase/config';
import { collection, doc, getDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { REGLAS_APP, ESTADOS_ALBUM } from '../constants/reglas';
import { RETOS_POR_DEFECTO } from '../constants/retosBase';

export const useAlbum = () => {
  const [cargando, setCargando] = useState(false);

  // 1. Función para crear un álbum con transacción atómica escalable
  const crearAlbum = async (creadorId, emailUsuario, fechaEventoStr, configuracionCliente) => {
    setCargando(true);
    try {
      if (!emailUsuario) {
        throw new Error("Se requiere el correo del usuario para validar permisos.");
      }

      const emailFormateado = emailUsuario.toLowerCase();
      const userRef = doc(db, 'usuarios', emailFormateado);
      const nuevoAlbumRef = doc(collection(db, 'albums'));

      const fechaExpiracion = new Date();
      fechaExpiracion.setHours(fechaExpiracion.getHours() + REGLAS_APP.TRIAL_LIMITES.HORAS_AUTODESTRUCCION);

      // Transacción atómica en Firestore para prevenir condiciones de carrera (Race Conditions)
      const datosAlbumCreado = await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);

        let esLocalSuscrito = false;
        let creditosDisponibles = 0;

        if (userSnap.exists()) {
          const userData = userSnap.data();
          esLocalSuscrito = userData.esLocalSuscrito || false;
          creditosDisponibles = userData.creditosDisponibles || 0;
        }

        // EVALUACIÓN DE REGLAS DE NEGOCIO Y SALDOS
        let estadoAlbum = ESTADOS_ALBUM.TRIAL;
        let esAlbumLocal = false;

        if (esLocalSuscrito) {
          // Caso 1: Suscripción mensual de local activa (Ilimitado)
          estadoAlbum = ESTADOS_ALBUM.PAGADO;
          esAlbumLocal = true;
        } else if (creditosDisponibles > 0) {
          // Caso 2: Pase de evento comprado (Descontar 1 crédito atómicamente)
          estadoAlbum = ESTADOS_ALBUM.PAGADO;
          esAlbumLocal = false;
          transaction.update(userRef, {
            creditosDisponibles: creditosDisponibles - 1
          });
        } else {
          // Caso 3: Saldo cero -> Interrumpir transacción y lanzar código especial de pago
          const errorSinCreditos = new Error("SIN_CREDITOS");
          errorSinCreditos.code = "SIN_CREDITOS";
          throw errorSinCreditos;
        }

        const datosAlbum = {
          id: nuevoAlbumRef.id,
          creadorId: creadorId,
          adminId: creadorId, // Mantiene compatibilidad con la consulta de index.js
          creadorEmail: emailFormateado,
          fechaEvento: fechaEventoStr,
          nombreEvento: configuracionCliente.nombreEvento || "Mi Evento",
          tipoEvento: configuracionCliente.tipoEvento || "", // <-- Añadido
          portadaUrl: configuracionCliente.portadaUrl || "", // <-- Añadido (Muestra miniatura en Home)
          estado: estadoAlbum,
          esLocal: esAlbumLocal,
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
          listaRetos: RETOS_POR_DEFECTO,
          creadoEn: new Date().toISOString()
        };

        transaction.set(nuevoAlbumRef, datosAlbum);
        return datosAlbum;
      });

      setCargando(false);
      return datosAlbumCreado;
    } catch (error) {
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

  // 3. Función de validación para límites de carga
  const puedeSubirAccion = (album, tipoAccion) => {
    if (album.estado === ESTADOS_ALBUM.PAGADO) return true;

    const limites = REGLAS_APP.TRIAL_LIMITES;
    if (tipoAccion === 'FOTO' && album.contadores.fotos >= limites.FOTOS) return false;
    if (tipoAccion === 'HISTORIA' && album.contadores.historias >= limites.HISTORIAS) return false;
    if (tipoAccion === 'AUDIO' && album.contadores.audios >= limites.AUDIOS) return false;
    if (tipoAccion === 'RETO' && album.contadores.retos >= limites.RETOS) return false;

    return true;
  };

  // 4. Actualizar lista de retos en la base de datos
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
