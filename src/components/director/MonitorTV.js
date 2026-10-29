import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function MonitorTV({ albumId }) {
  const [itemActual, setItemActual] = useState(null);

  useEffect(() => {
    if (!albumId) return;

    // Escuchamos directamente el reporte (Walkie-Talkie) de la TV en el documento del álbum
    const docRef = doc(db, 'albums', albumId);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Leemos lo que la TV gigante nos jura que está proyectando en este milisegundo
        if (data.tv && data.tv.actual) {
          setItemActual(data.tv.actual);
        } else {
          setItemActual(null);
        }
      }
    });

    return () => unsubscribe();
  }, [albumId]);

  return (
    <section className="bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col overflow-hidden shadow-lg h-full">
      {/* Cabecera */}
      <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          📺 Monitor TV
        </h2>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded-md uppercase tracking-wider shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
          Retorno Exacto
        </span>
      </div>

      {/* Pantalla del monitor */}
      <div className="flex-1 bg-black relative flex items-center justify-center p-2">
        {!itemActual ? (
          <div className="text-center">
            <div className="text-4xl mb-2 opacity-30">🖼️</div>
            <p className="text-xs text-zinc-500">Esperando señal de la TV...</p>
          </div>
        ) : (
          <div className="w-full h-full rounded-lg overflow-hidden relative flex items-center justify-center bg-zinc-950 border border-zinc-800">
            {itemActual.tipo === 'video' ? (
              <video src={itemActual.url} autoPlay loop muted playsInline className="w-full h-full object-contain pointer-events-none" />
            ) : (
              <img src={itemActual.url} className="w-full h-full object-contain pointer-events-none" alt="Monitor" />
            )}
            
            {/* Etiqueta flotante con el nombre de quien lo subió */}
            <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white font-bold tracking-wide border border-white/10">
              {itemActual.subidoPorNombre || 'Invitado'}
            </div>
          </div>
        )}
      </div>
      
      {/* Controles de la TV (Footer) */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900 flex justify-between items-center">
         <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Modo Espejo Activo</span>
      </div>
    </section>
  );
}