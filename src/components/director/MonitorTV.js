import { useEffect, useRef, useState } from 'react';

export default function MonitorTV({ albumId }) {
  const contenedorRef = useRef(null);
  const [escala, setEscala] = useState(0.2);

  // El cerebro que calcula exactamente cuánto encoger la TV gigante (1920x1080) 
  // para que encaje perfecto en tu panel sin deformarse.
  useEffect(() => {
    const recalcularEscala = () => {
      if (contenedorRef.current) {
        const anchoCaja = contenedorRef.current.getBoundingClientRect().width;
        // 1920 es el ancho estándar de una TV.
        setEscala(anchoCaja / 1920);
      }
    };
    
    recalcularEscala();
    window.addEventListener('resize', recalcularEscala);
    return () => window.removeEventListener('resize', recalcularEscala);
  }, []);

  if (!albumId) return null;

  return (
    <section className="bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col overflow-hidden shadow-lg h-full">
      <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-800 flex justify-between items-center shrink-0">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          📺 Monitor TV
        </h2>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded-md uppercase tracking-wider shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
          Espejo 1:1
        </span>
      </div>

      <div className="flex-1 bg-black relative p-2 min-h-0 flex items-center justify-center">
        {/* Caja que fuerza el formato 16:9 estricto */}
        <div 
          ref={contenedorRef} 
          className="relative w-full aspect-video overflow-hidden rounded-lg bg-zinc-950 border border-zinc-800"
        >
          <iframe 
            src={`/${albumId}/pantalla`} 
            className="absolute top-0 left-0 origin-top-left pointer-events-auto border-0"
            style={{ 
              width: '1920px', 
              height: '1080px', 
              transform: `scale(${escala})` 
            }}
            title="Señal en vivo"
          />
        </div>
      </div>
      
      <div className="p-3 border-t border-zinc-800 bg-zinc-900 flex justify-between items-center shrink-0">
         <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Transmisión Real Escalada</span>
      </div>
    </section>
  );
}