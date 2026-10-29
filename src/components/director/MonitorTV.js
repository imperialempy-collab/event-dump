import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function MonitorTV({ albumId }) {
  const [itemActual, setItemActual] = useState(null);

  useEffect(() => {
    if (!albumId) return;

    // Escuchamos las últimas 5 publicaciones para encontrar la más reciente que NO esté oculta
    const q = query(
      collection(db, 'albums', albumId, 'fotos'), 
      orderBy('creadoEn', 'desc'), 
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const publicaciones = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filtramos: la que está en la TV es la primera que NO tiene la etiqueta "oculto: true"
      const publicacionActiva = publicaciones.find(p => p.oculto !== true);
      setItemActual(publicacionActiva || null);
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
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded-md uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
          Señal en vivo
        </span>
      </div>

      {/* Pantalla del monitor */}
      <div className="flex-1 bg-black relative flex items-center justify-center p-2">
        {!itemActual ? (
          <div className="text-center">
            <div className="text-4xl mb-2 opacity-30">🖼️</div>
            <p className="text-xs text-zinc-500">Esperando publicaciones...</p>
          </div>
        ) : (
          <div className="w-full h-full rounded-lg overflow-hidden relative flex items-center justify-center bg-zinc-950 border border-zinc-800">
            {itemActual.tipo === 'video' ? (
              <video src={itemActual.url} autoPlay loop muted playsInline className="w-full h-full object-contain" />
            ) : (
              <img src={itemActual.url} className="w-full h-full object-contain" alt="Monitor" />
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
         <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Carrusel Automático</span>
         <button 
            className="text-xs font-bold text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 rounded-lg transition shadow-sm active:scale-95"
            title="Forzar salto a la siguiente foto en la TV"
         >
           Saltar ⏭️
         </button>
      </div>
    </section>
  );
}