import React, { useState, useEffect, useRef } from 'react';
import { RETOS_POR_DEFECTO } from '../constants/retosBase';

export default function SorteoReto({ album, onClose }) {
  const [paso, setPaso] = useState('animando'); // 'animando', 'resultado', 'ampliado'
  const [contador, setContador] = useState(3);
  const [retoGanador, setRetoGanador] = useState(null);

  // Referencias para medir los bordes y el texto en tiempo real
  const containerRef = useRef(null);
  const textRef = useRef(null);

  // Obtener la lista de retos
  const listaRetos = album?.listaRetos?.length > 0 ? album.listaRetos : RETOS_POR_DEFECTO;
  const retosActivos = listaRetos.filter(r => r.activo !== false);

  const iniciarSorteo = () => {
    setPaso('animando');
    setContador(3);
    
    let tiempo = 3;
    const intervalo = setInterval(() => {
      tiempo -= 1;
      if (tiempo > 0) {
        setContador(tiempo);
      } else {
        clearInterval(intervalo);
        const retoAzar = retosActivos[Math.floor(Math.random() * retosActivos.length)];
        setRetoGanador(retoAzar);
        setPaso('resultado');
      }
    }, 1000);
  };

  useEffect(() => {
    iniciarSorteo();
  }, []);

  // EFECTO MÁGICO: Auto-ajuste de texto detectando los bordes
  useEffect(() => {
    if (paso === 'ampliado' && textRef.current && containerRef.current) {
      const textEl = textRef.current;
      const containerEl = containerRef.current;

      // 1. Empezamos con una letra gigante (150px)
      let fontSize = 150; 
      textEl.style.fontSize = `${fontSize}px`;

      // 2. Bucle inteligente: Mientras el texto se salga de los bordes del contenedor...
      // (scrollHeight = altura real del texto, clientHeight = espacio disponible)
      while (
        (textEl.scrollHeight > containerEl.clientHeight || textEl.scrollWidth > containerEl.clientWidth) 
        && fontSize > 20 // Límite mínimo para que no desaparezca
      ) {
        fontSize -= 2; // ...le bajamos 2px al tamaño
        textEl.style.fontSize = `${fontSize}px`;
      }
    }
  }, [paso, retoGanador]);

  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-zinc-950 overflow-hidden select-none font-sans">
      
      {paso !== 'ampliado' && (
        <button onClick={onClose} className="absolute top-6 right-6 z-50 text-white/50 hover:text-white text-4xl font-light transition">
          ×
        </button>
      )}

      {/* FASE 1: ANIMACIÓN DE CONTADOR LIMPIO */}
      {paso === 'animando' && (
        <>
          <div className="relative z-10 flex items-center justify-center">
            <span key={contador} className="text-[150px] font-black text-transparent bg-clip-text bg-gradient-to-b from-blue-400 to-purple-600 animate-pulse-fast drop-shadow-[0_0_40px_rgba(59,130,246,0.8)]">
              {contador}
            </span>
          </div>
          <style>{`
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

      {/* FASE 3: MODO AMPLIADO (Cartel Horizontal Inteligente) */}
      {paso === 'ampliado' && (
        <div 
          className="fixed inset-0 bg-white z-[400] flex items-center justify-center overflow-hidden animate-fade-in" 
          onClick={() => setPaso('resultado')}
        >
          {/* El contenedor principal detecta si está en vertical y se rota 90 grados */}
          <div className="portrait:w-[100vh] portrait:h-[100vw] portrait:-rotate-90 landscape:w-screen landscape:h-screen flex flex-col items-center justify-center p-8 relative">
            
            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-30">
               <span className="text-black text-xs font-bold uppercase tracking-widest mb-1">Toque para salir</span>
               <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
               </svg>
            </div>

            {/* Este div es la 'Caja' que define los bordes invisibles */}
            <div ref={containerRef} className="w-full h-full max-h-[80%] flex items-center justify-center mt-6">
              <h1 
                ref={textRef} 
                className="font-black text-black text-center uppercase tracking-tighter leading-tight w-full break-words"
              >
                {retoGanador?.texto}
              </h1>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}