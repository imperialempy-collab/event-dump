import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function Carrete({ albumId }) {
  const [cola, setCola] = useState([]);

  // Escuchamos la "Cola" de próximas fotos que nos envía el Walkie-Talkie de la TV
  useEffect(() => {
    if (!albumId) return;
    const docRef = doc(db, 'albums', albumId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().tv?.cola) {
        setCola(docSnap.data().tv.cola);
      } else {
        setCola([]);
      }
    });
    return () => unsubscribe();
  }, [albumId]);

  // Función de Censura (El botón rojo)
  const censurarPublicacion = async (fotoId) => {
    if (!fotoId || fotoId === 'sin-id') return;
    try {
      // Entramos al documento original de la foto y lo marcamos como oculto
      await updateDoc(doc(db, 'albums', albumId, 'fotos', fotoId), {
        oculto: true
      });
      console.log("Publicación censurada y eliminada de la cola");
    } catch (error) {
      console.error("Error al censurar:", error);
    }
  };

  return (
    <section className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 h-64 flex flex-col shadow-lg shrink-0">
       <div className="flex justify-between items-center mb-3">
         <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
           🎞️ Carrete de Publicaciones
         </h2>
         <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-950 px-2 py-1 rounded">
           Próximas en cola
         </span>
       </div>

       {/* Contenedor scrolleable horizontal de las fotos */}
       <div className="flex-1 overflow-x-auto overflow-y-hidden flex gap-4 pb-2 snap-x">
         {cola.length === 0 ? (
           <div className="w-full h-full border border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center text-zinc-600">
             <span className="text-2xl mb-2 opacity-30">⏳</span>
             <span className="text-xs uppercase tracking-widest">Esperando datos de la TV...</span>
           </div>
         ) : (
           cola.map((item, index) => (
             <div key={`${item.id}-${index}`} className="relative h-full aspect-[9/16] bg-black rounded-lg border border-zinc-700 overflow-hidden shrink-0 snap-center group shadow-md hover:border-zinc-500 transition-colors">
               
               {/* Etiqueta de orden en la fila (#1, #2, etc) */}
               <div className="absolute top-2 left-2 z-10 bg-black/80 text-white text-[10px] font-black px-2 py-1 rounded border border-white/20">
                 #{index + 1}
               </div>
               
               {/* BOTÓN DE CENSURA (Se muestra al pasar el mouse) */}
               <button 
                 onClick={() => censurarPublicacion(item.id)}
                 className="absolute top-2 right-2 z-20 w-8 h-8 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-red-400"
                 title="Censurar y Saltar"
               >
                 ✕
               </button>

               {/* La miniatura de la foto/video */}
               {item.tipo === 'video' ? (
                 <video src={item.url} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
               ) : (
                 <img src={item.url} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt="Preview" />
               )}
               
               {/* Nombre del invitado */}
               <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2 pt-6">
                 <p className="text-[10px] text-white font-bold truncate">
                   {item.subidoPorNombre || 'Invitado'}
                 </p>
               </div>

             </div>
           ))
         )}
       </div>
    </section>
  );
}