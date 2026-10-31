import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function MonitorTV({ albumId }) {
  const [itemActual, setItemActual] = useState(null);

  useEffect(() => {
    if (!albumId) return;

    // Conexión Maestra: Leemos la orden exacta de la TV
    const docRef = doc(db, 'albums', albumId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().tv?.actual) {
        setItemActual(docSnap.data().tv.actual);
      } else {
        setItemActual(null);
      }
    });

    return () => unsubscribe();
  }, [albumId]);

  return (
    <section className="bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col shadow-lg h-full">
      {/* Cabecera */}
      <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-800 flex justify-between items-center shrink-0 rounded-t-2xl">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          📺 Monitor TV
        </h2>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded-md uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
          Sincronización Exacta
        </span>
      </div>

      {/* 
        EL CONTENEDOR BLINDADO: 
        Aquí está la magia visual. Centramos una caja con 'aspect-video' (16:9). 
        Esta caja simula ser la TV física. Nunca se deformará.
      */}
      <div className="flex-1 bg-black p-4 flex items-center justify-center min-h-0">
        <div className="relative w-full aspect-video bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
          
          {!itemActual ? (
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-3xl opacity-30 mb-2">🖼️</span>
              <span className="text-xs text-zinc-500 font-medium">Esperando TV...</span>
            </div>
          ) : (
            <>
              {/* Contenido Multimedia (Clonado) */}
              {itemActual.tipo === 'video' ? (
                <video src={itemActual.url} autoPlay loop muted playsInline className="w-full h-full object-contain" />
              ) : (
                <img src={itemActual.url} className="w-full h-full object-contain" alt="Monitor" />
              )}

              {/* Etiqueta simulando el diseño de la TV */}
              <div className="absolute bottom-2 right-2 flex items-center gap-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 shadow-lg">
                <span className="text-[9px] text-white font-bold tracking-widest uppercase">
                  {itemActual.subidoPorNombre || 'Invitado'}
                </span>
              </div>
            </>
          )}

        </div>
      </div>
      
      {/* Footer */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900 flex justify-between items-center shrink-0 rounded-b-2xl">
         <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Datos en Tiempo Real</span>
      </div>
    </section>
  );
}