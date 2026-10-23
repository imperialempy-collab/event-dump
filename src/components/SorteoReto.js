import React, { useState, useEffect, useMemo } from 'react';
import { RETOS_POR_DEFECTO } from '../constants/retosBase';

export default function SorteoReto({ album, onClose }) {
  const [paso, setPaso] = useState('animando'); // 'animando', 'resultado', 'ampliado'
  const [contador, setContador] = useState(3);
  const [retoGanador, setRetoGanador] = useState(null);

  // Obtener la lista de retos (los del álbum, o los por defecto si es un álbum viejo)
  const listaRetos = album?.listaRetos?.length > 0 ? album.listaRetos : RETOS_POR_DEFECTO;
  const retosActivos = listaRetos.filter(r => r.activo !== false); // Por si luego el dueño desactiva algunos

  // Generador de la lluvia (20 palabras flotando)
  const lluvia = useMemo(() => {
    return Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      texto: retosActivos[Math.floor(Math.random() * retosActivos.length)].texto,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 1}s`,
      duration: `${1.5 + Math.random() * 1.5}s`,
      size: `${14 + Math.random() * 14}px`,
      opacity: 0.1 + Math.random() * 0.3
    }));
  }, [retosActivos]);

  const iniciarSorteo = () => {
    setPaso('animando');
    setContador(3);
    
    // Cuenta regresiva
    let tiempo = 3;
    const intervalo = setInterval(() => {
      tiempo -= 1;
      if (tiempo > 0) {
        setContador(tiempo);
      } else {
        clearInterval(intervalo);
        // Seleccionar reto al azar
        const retoAzar = retosActivos[Math.floor(Math.random() * retosActivos.length)];
        setRetoGanador(retoAzar);
        setPaso('resultado');
      }
    }, 1000);
  };

  // Arrancar el sorteo al abrir
  useEffect(() => {
    iniciarSorteo();
  }, []);

  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-zinc-950 overflow-hidden select-none font-sans">
      
      {/* Botón de cerrar superior */}
      {paso !== 'ampliado' && (
        <button onClick={onClose} className="absolute top-6 right-6 z-50 text-white/50 hover:text-white text-4xl font-light transition">
          ×
        </button>
      )}

      {/* FASE 1: ANIMACIÓN DE LLUVIA Y CONTADOR */}
      {paso === 'animando' && (
        <>
          {/* Lluvia de palabras (GPU Acelerada) */}
          <div className="absolute inset-0 pointer-events-none" style={{ transform: 'translateZ(0)' }}>
            {lluvia.map(gota => (
              <div 
                key={gota.id} 
                className="absolute text-white font-bold whitespace-nowrap anim-lluvia"
                style={{
                  left: gota.left, top: '-50px', fontSize: gota.size, opacity: gota.opacity,
                  animationDuration: gota.duration, animationDelay: gota.delay
                }}
              >
                {gota.texto}
              </div>
            ))}
          </div>

          {/* Contador Gigante */}
          <div className="relative z-10 flex items-center justify-center">
            <span key={contador} className="text-[150px] font-black text-transparent bg-clip-text bg-gradient-to-b from-blue-400 to-purple-600 animate-pulse-fast drop-shadow-[0_0_40px_rgba(59,130,246,0.8)]">
              {contador}
            </span>
          </div>

          <style>{`
            @keyframes caer {
              0% { transform: translateY(-10vh) translateZ(0); opacity: 0; }
              10% { opacity: var(--op); }
              90% { opacity: var(--op); }
              100% { transform: translateY(110vh) translateZ(0); opacity: 0; }
            }
            .anim-lluvia { animation: caer linear infinite; }
            .animate-pulse-fast { animation: pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite alternate; }
            @keyframes pulse { 0% { transform: scale(1); } 100% { transform: scale(1.15); } }
          `}</style>
        </>
      )}

      {/* FASE 2: RESULTADO DEL SORTEO */}
      {paso === 'resultado' && (
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-8 animate-fade-in">
          <p className="text-yellow-400 text-sm font-bold mb-6 tracking-[0.3em] uppercase text-center drop-shadow-md">
            ¡Tu Reto es!
          </p>
          
          <h2 className="text-4xl md:text-5xl text-white font-black text-center mb-14 drop-shadow-2xl leading-tight">
            {retoGanador?.texto}
          </h2>
          
          <div className="flex gap-4 w-full max-w-sm">
            <button 
              onClick={iniciarSorteo} 
              className="flex-1 bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-bold text-sm tracking-widest uppercase hover:bg-white/10 transition active:scale-95"
            >
              🔄 Otro
            </button>
            <button 
              onClick={() => setPaso('ampliado')} 
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-sm tracking-widest uppercase shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:scale-105 transition active:scale-95"
            >
              🔲 Ampliar
            </button>
          </div>
        </div>
      )}

      {/* FASE 3: MODO AMPLIADO (Cartel para Foto) */}
      {paso === 'ampliado' && (
        <div className="absolute inset-0 bg-white z-[400] flex items-center justify-center p-6 animate-fade-in" onClick={() => setPaso('resultado')}>
          
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-30">
             <span className="text-black text-xs font-bold uppercase tracking-widest mb-1">Toque para salir</span>
             <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-black text-center uppercase tracking-tighter leading-[1.1] break-words">
            {retoGanador?.texto}
          </h1>
          
        </div>
      )}

    </div>
  );
}