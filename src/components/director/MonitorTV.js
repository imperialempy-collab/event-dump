import { useEffect } from 'react';

export default function MonitorTV({ albumId }) {
  if (!albumId) return null;

  return (
    <section className="bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col overflow-hidden shadow-lg h-full">
      {/* Cabecera */}
      <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-800 flex justify-between items-center shrink-0">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          📺 Monitor TV
        </h2>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded-md uppercase tracking-wider shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
          Espejo 1:1
        </span>
      </div>

      {/* EL ESPEJO: Incrustamos la ruta de la pantalla real */}
      <div className="flex-1 bg-black relative p-2 min-h-0">
        <div className="absolute inset-2 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800">
          
          {/* 
            Usamos un iframe apuntando a tu página real de transmisión.
            pointer-events-auto permite que el DJ pueda interactuar con los 
            botones de esa minipantalla (ej: darle click a Iniciar Transmisión o mutear).
          */}
          <iframe 
            src={`/${albumId}/pantalla`} 
            className="w-full h-full border-0 pointer-events-auto"
            title="Señal en vivo"
          />

        </div>
      </div>
      
      {/* Footer */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900 flex justify-between items-center shrink-0">
         <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Transmisión Real</span>
      </div>
    </section>
  );
}