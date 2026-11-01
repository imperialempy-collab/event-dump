import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function BotoneraMaster({ albumId }) {
  const [mostrarQR, setMostrarQR] = useState(false);

  // Escuchamos el estado del QR desde Firebase
  useEffect(() => {
    if (!albumId) return;
    const docRef = doc(db, 'albums', albumId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().comandosTV) {
        setMostrarQR(docSnap.data().comandosTV.mostrarQR || false);
      }
    });
    return () => unsubscribe();
  }, [albumId]);

  // Función para encender o apagar el QR en la TV
  const toggleQR = async () => {
    try {
      await updateDoc(doc(db, 'albums', albumId), {
        'comandosTV.mostrarQR': !mostrarQR
      });
    } catch (error) {
      console.error("Error al actualizar QR:", error);
    }
  };

  return (
    <section className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 flex flex-col h-full shadow-lg shrink-0">
      <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-4">
        🎛️ Botonera Master
      </h2>

      <div className="flex-1 flex flex-col gap-3">
        {/* Interruptor del QR */}
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-sm">Proyectar QR en TV</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">
              QR directo a la cámara
            </p>
          </div>
          
          <button 
            onClick={toggleQR}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none shadow-inner ${mostrarQR ? 'bg-blue-600' : 'bg-zinc-700'}`}
          >
            <span 
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${mostrarQR ? 'translate-x-8' : 'translate-x-1'}`} 
            />
          </button>
        </div>

        {/* Aviso de estado */}
        {mostrarQR && (
          <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-xl flex items-center gap-3 animate-pulse">
            <span className="text-xl">📡</span>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest leading-relaxed">
              El QR está visible en la Pantalla Gigante
            </p>
          </div>
        )}
      </div>
    </section>
  );
}