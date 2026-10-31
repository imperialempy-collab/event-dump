import { useRouter } from 'next/router';
import { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../../firebase/config';
import { doc, collection, onSnapshot, query, orderBy, updateDoc } from 'firebase/firestore';

const ParticulasFondo = () => {
  const particles = useMemo(() => Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    animationDuration: `${10 + Math.random() * 20}s`,
    animationDelay: `-${Math.random() * 20}s`,
    size: `${2 + Math.random() * 5}px`,
    opacity: 0.3 + Math.random() * 0.5
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" style={{ transform: 'translateZ(0)' }}>
      {particles.map(p => (
        <div key={p.id} className="absolute bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
          style={{
            left: p.left, width: p.size, height: p.size, bottom: '-10px',
            opacity: p.opacity,
            animation: `floatUp ${p.animationDuration} linear infinite`,
            animationDelay: p.animationDelay
          }}
        />
      ))}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-105vh) scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default function PantallaGigante() {
  const router = useRouter();
  
  // EL SWITCH MAESTRO: ¿Soy la TV real o soy el cuadrito del director?
  const { albumId, espejo } = router.query;
  const isEspejo = espejo === 'true'; 
  
  const [archivos, setArchivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  const [transmisionIniciada, setTransmisionIniciada] = useState(false);
  const [preparandoBuffer, setPreparandoBuffer] = useState(true);

  const [colaReproduccion, setColaReproduccion] = useState([]);
  const [currentItem, setCurrentItem] = useState(null);
  
  const [interrupciones, setInterrupciones] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [audioHabilitado, setAudioHabilitado] = useState(true);
  const [showControls, setShowControls] = useState(false);

  const prevArchivosLengthRef = useRef(0);
  const timerRef = useRef(null);
  const latestArchivosRef = useRef([]);

  // 1. Escuchar archivos (Ignora los ocultados)
  useEffect(() => {
    if (!albumId) return;
    const q = query(collection(db, 'albums', albumId, 'fotos'), orderBy('creadoEn', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        likesArray: doc.data().likesArray || [], 
        comentarios: doc.data().comentarios || [],
        ...doc.data() 
      })).filter(item => item.oculto !== true); 
      
      setArchivos(data);
      latestArchivosRef.current = data;
      setCargando(false);

      if (prevArchivosLengthRef.current > 0 && data.length > prevArchivosLengthRef.current) {
        const nuevos = data.slice(0, data.length - prevArchivosLengthRef.current);
        setInterrupciones(prev => [...prev, ...nuevos]);
      }
      prevArchivosLengthRef.current = data.length;
    });
    return () => unsubscribe();
  }, [albumId]);

  // 2. Generador de la secuencia
  const generarNuevaCola = () => {
    const data = latestArchivosRef.current;
    if (data.length === 0) return [];
    const ranking = [...data]
      .filter(a => (a.likesArray || []).length > 0)
      .sort((a, b) => b.likesArray.length - a.likesArray.length || (b.creadoEn?.toMillis?.() || 0) - (a.creadoEn?.toMillis?.() || 0));
    const muro = [...data].filter(a => !ranking.some(r => r.id === a.id));
    return [...ranking, ...muro];
  };

  // Lobby inicial (Cortado si es espejo)
  useEffect(() => {
    if (isEspejo) {
      setPreparandoBuffer(false); // El espejo no prepara buffers, solo copia
      return;
    }
    if (archivos.length > 0 && colaReproduccion.length === 0 && !currentItem) {
      setColaReproduccion(generarNuevaCola());
      const t = setTimeout(() => setPreparandoBuffer(false), 2500);
      return () => clearTimeout(t);
    }
  }, [archivos, isEspejo]);

  // 3. Motor de avance (Cortado si es espejo)
  const avanzar = () => {
    if (isEspejo) return; // El esclavo no avanza por su cuenta

    let nextItem = null;
    let nuevaCola = [...colaReproduccion];

    if (interrupciones.length > 0) {
      nextItem = interrupciones[0];
      setInterrupciones(prev => prev.slice(1));
    } else {
      if (nuevaCola.length === 0) nuevaCola = generarNuevaCola();
      if (nuevaCola.length > 0) {
        nextItem = nuevaCola[0];
        setColaReproduccion(nuevaCola.slice(1));
      }
    }
    if (!nextItem && latestArchivosRef.current.length > 0) {
      nextItem = latestArchivosRef.current[0];
      setColaReproduccion(generarNuevaCola().slice(1));
    }
    setCurrentItem(nextItem);
  };

  // 4. Temporizador Automático (Cortado si es espejo)
  useEffect(() => {
    if (isEspejo || !transmisionIniciada) return;
    if (!currentItem && archivos.length > 0) { avanzar(); return; }
    if (isPaused || !currentItem) return;
    
    const tiempoLimite = currentItem.tipo === 'video' ? 45000 : 8000;
    timerRef.current = setTimeout(() => { avanzar(); }, tiempoLimite);
    return () => clearTimeout(timerRef.current);
  }, [currentItem, isPaused, interrupciones, archivos.length, transmisionIniciada, isEspejo]);
  
  // 5. Watchdog (Cortado si es espejo)
  useEffect(() => {
    if (isEspejo || !transmisionIniciada || isPaused) return;
    const watchdog = setInterval(() => {
      if (!currentItem && latestArchivosRef.current.length > 0) avanzar();
    }, 5000);
    return () => clearInterval(watchdog);
  }, [currentItem, transmisionIniciada, isPaused, isEspejo]);

  // =====================================================================
  // 6. EL CEREBRO HÍBRIDO (Maestro vs Esclavo)
  // =====================================================================
  useEffect(() => {
    if (!albumId) return;

    if (isEspejo) {
      // --- SI SOY EL ESPEJO (ESCLAVO) ---
      // Solo escucho a Firebase y copio todo lo que hace la TV
      const unsubscribe = onSnapshot(doc(db, 'albums', albumId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.tv) {
            setTransmisionIniciada(!data.tv.lobby); // Copio el estado del lobby
            setCurrentItem(data.tv.actual || null); // Copio la foto exacta
            setAudioHabilitado(false); // SILENCIO MODO ESCLAVO para que no haga eco
          }
        }
      });
      return () => unsubscribe();

    } else {
      // --- SI SOY LA TV GIGANTE (MAESTRO) ---
      // Escribo en Firebase lo que estoy haciendo
      const reportarEstado = async () => {
        try {
          const estadoTV = {
            lobby: !transmisionIniciada,
            actual: currentItem ? { 
              id: currentItem.id || 'sin-id', 
              url: currentItem.url || '', 
              tipo: currentItem.tipo || 'imagen', 
              subidoPorNombre: currentItem.subidoPorNombre || 'Invitado',
              comentarios: currentItem.comentarios || [],
              likesArray: currentItem.likesArray || []
            } : null,
            cola: colaReproduccion.slice(0, 5).map(item => ({ 
              id: item.id || 'sin-id', 
              url: item.url || '', 
              tipo: item.tipo || 'imagen', 
              subidoPorNombre: item.subidoPorNombre || 'Invitado' 
            }))
          };
          await updateDoc(doc(db, 'albums', albumId), { tv: estadoTV });
        } catch (error) { console.error("Error al transmitir estado", error); }
      };
      reportarEstado();
    }
  }, [currentItem, colaReproduccion, transmisionIniciada, albumId, isEspejo]);

  // 7. KILL-SWITCH (Cortado si es espejo)
  useEffect(() => {
    if (isEspejo) return;
    if (currentItem && transmisionIniciada) {
      const fotoAunExiste = archivos.some(a => a.id === currentItem.id);
      if (!fotoAunExiste) avanzar(); 
    }
  }, [archivos, currentItem, transmisionIniciada, isEspejo]);

  // Controles
  const iniciarTransmisionManual = () => {
    setAudioHabilitado(true);
    setTransmisionIniciada(true);
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  };

  const reiniciar = () => {
    setInterrupciones([]);
    setColaReproduccion(generarNuevaCola());
    setCurrentItem(null); 
    setIsPaused(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  };

  const itemsParaPrecargar = useMemo(() => {
    if (isEspejo) return []; // El esclavo no gasta memoria precargando
    const lista = [];
    if (interrupciones.length > 0) lista.push(...interrupciones);
    if (colaReproduccion.length > 0) lista.push(...colaReproduccion.slice(0, 2));
    return lista.filter((item, index, self) => index === self.findIndex((t) => t.id === item.id)); 
  }, [interrupciones, colaReproduccion, isEspejo]);

  if (cargando) return <div className="min-h-screen bg-black flex items-center justify-center text-white/50 text-2xl tracking-widest uppercase">Conectando...</div>;
  if (archivos.length === 0) return <div className="min-h-screen bg-black flex items-center justify-center text-white/50 text-2xl tracking-widest uppercase">Esperando contenido...</div>;

  return (
    <div 
      className="min-h-screen bg-black flex flex-col font-sans overflow-hidden relative cursor-default select-none"
      onMouseMove={() => { setShowControls(true); clearTimeout(window.controlsTimeout); window.controlsTimeout = setTimeout(() => setShowControls(false), 3000); }}
    >
      
      {!isEspejo && (
        <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, overflow: 'hidden', zIndex: -100 }}>
          {itemsParaPrecargar.map(item => (
            item.tipo === 'video' ? <video key={`buf-${item.id}`} src={item.url} preload="auto" muted /> : <img key={`buf-${item.id}`} src={item.url} alt="preload" />
          ))}
        </div>
      )}

      {!transmisionIniciada && (
        <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-zinc-900 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800 to-black text-white">
            <h1 className="text-5xl font-black mb-10 tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-2xl">
              Social Wall
            </h1>
            
            {preparandoBuffer ? (
              <div className="flex flex-col items-center gap-4 animate-pulse">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xl font-medium tracking-wider text-zinc-300">Preparando motor gráfico y caché...</p>
              </div>
            ) : (
              <button 
                onClick={iniciarTransmisionManual}
                className="group relative px-10 py-5 bg-blue-600 rounded-full font-bold text-2xl tracking-widest uppercase shadow-[0_0_40px_rgba(37,99,235,0.6)] hover:scale-105 hover:bg-blue-500 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                <span className="relative flex items-center gap-3">
                  ▶ Iniciar Transmisión
                </span>
              </button>
            )}
            
            <p className="absolute bottom-10 text-zinc-500 text-sm tracking-widest uppercase">
              {archivos.length} publicaciones listas
            </p>
        </div>
      )}

      {transmisionIniciada && (
        <>
          <ParticulasFondo />

          <div className="absolute inset-0 w-full h-full">
            {currentItem && (
              <div key={`curr-${currentItem.id}`} className="absolute inset-0 w-full h-full flex items-center justify-center p-12 z-20" style={{ transform: 'translateZ(0)' }}>
                
                <div className="relative w-full h-full flex items-center justify-center animate-fade-in">
                   {currentItem.tipo === 'video' ? (
                    <video src={currentItem.url} autoPlay muted={!audioHabilitado} playsInline onEnded={avanzar} onError={avanzar} className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.7)] rounded-3xl border border-white/10" />
                  ) : (
                    <img src={currentItem.url} className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.7)] rounded-3xl border border-white/10" />
                  )}

                  <div className="absolute bottom-6 right-6 flex items-center gap-4 bg-black/40 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 shadow-2xl">
                    {(currentItem.comentarios || []).length > 0 && (
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-white/90"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        <span className="text-white font-bold text-2xl">{(currentItem.comentarios || []).length}</span>
                      </div>
                    )}
                    
                    {(currentItem.comentarios || []).length > 0 && (currentItem.likesArray || []).length > 0 && (
                      <div className="w-px h-8 bg-white/20"></div>
                    )}

                    {(currentItem.likesArray || []).length > 0 && (
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-red-500 drop-shadow-md"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        <span className="text-white font-bold text-2xl drop-shadow-md">{(currentItem.likesArray || []).length}</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Ocultamos los botones flotantes de play/pause en el monitor esclavo */}
          <div className={`absolute bottom-10 left-10 z-50 flex gap-4 transition-opacity duration-500 ${(showControls && !isEspejo) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <button onClick={() => setIsPaused(!isPaused)} className="w-16 h-16 bg-white/10 backdrop-blur-lg border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition shadow-xl">
              {isPaused ? <span className="text-3xl pl-1">▶</span> : <span className="text-3xl font-black">II</span>}
            </button>
            <button onClick={() => setAudioHabilitado(!audioHabilitado)} className={`w-16 h-16 backdrop-blur-lg border rounded-full flex items-center justify-center text-white transition shadow-xl ${audioHabilitado ? 'bg-blue-600/60 border-blue-400' : 'bg-white/10 border-white/20'}`}>
              {audioHabilitado ? <span className="text-2xl">🔊</span> : <span className="text-2xl">🔇</span>}
            </button>
            <button onClick={reiniciar} className="px-8 h-16 bg-red-600/80 backdrop-blur-lg border border-red-400/50 rounded-full flex items-center justify-center text-white font-bold tracking-widest shadow-xl">
              REINICIAR
            </button>
            <button onClick={toggleFullscreen} className="w-16 h-16 bg-white/10 backdrop-blur-lg border border-white/20 rounded-full flex items-center justify-center text-white shadow-xl">
              <span className="text-2xl">⛶</span>
            </button>
          </div>
        </>
      )}

    </div>
  );
}