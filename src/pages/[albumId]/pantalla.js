import { useRouter } from 'next/router';
import { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';

// Componente para las estrellitas de fondo
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
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
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
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideOutLeft {
          from { transform: translateX(0); }
          to { transform: translateX(-100%); }
        }
        .anim-slide-in { animation: slideInRight 0.7s cubic-bezier(0.25, 0.8, 0.25, 1) forwards; }
        .anim-slide-out { animation: slideOutLeft 0.7s cubic-bezier(0.25, 0.8, 0.25, 1) forwards; }
      `}</style>
    </div>
  );
};

export default function PantallaGigante() {
  const router = useRouter();
  const { albumId } = router.query;
  
  const [archivos, setArchivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  const [colaReproduccion, setColaReproduccion] = useState([]);
  const [currentItem, setCurrentItem] = useState(null);
  const [prevItem, setPrevItem] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const [interrupciones, setInterrupciones] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [audioHabilitado, setAudioHabilitado] = useState(true);
  const [showControls, setShowControls] = useState(false);

  const prevArchivosLengthRef = useRef(0);
  const timerRef = useRef(null);
  const latestArchivosRef = useRef([]);

  // 1. Escuchar archivos en tiempo real
  useEffect(() => {
    if (!albumId) return;
    const q = query(collection(db, 'albums', albumId, 'fotos'), orderBy('creadoEn', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        likesArray: doc.data().likesArray || [], 
        comentarios: doc.data().comentarios || [],
        ...doc.data() 
      }));
      setArchivos(data);
      latestArchivosRef.current = data;
      setCargando(false);

      // Detectar si subieron algo nuevo AHORA (para la interrupción)
      if (prevArchivosLengthRef.current > 0 && data.length > prevArchivosLengthRef.current) {
        const nuevos = data.slice(0, data.length - prevArchivosLengthRef.current);
        setInterrupciones(prev => [...prev, ...nuevos]);
      }
      prevArchivosLengthRef.current = data.length;
    });
    return () => unsubscribe();
  }, [albumId]);

  // 2. Generador de la secuencia (Ranking -> Muro -> Repite)
  const generarNuevaCola = () => {
    const data = latestArchivosRef.current;
    const ranking = [...data]
      .filter(a => (a.likesArray || []).length > 0)
      .sort((a, b) => b.likesArray.length - a.likesArray.length || (b.creadoEn?.toMillis?.() || 0) - (a.creadoEn?.toMillis?.() || 0));
    
    const muro = [...data].filter(a => !ranking.some(r => r.id === a.id));
    return [...ranking, ...muro];
  };

  // 3. Motor de avance
  const avanzar = () => {
    let nextItem;
    let nuevaCola = [...colaReproduccion];

    if (interrupciones.length > 0) {
      // Prioridad 1: Interrupción (foto nueva)
      nextItem = interrupciones[0];
      setInterrupciones(prev => prev.slice(1));
    } else {
      // Prioridad 2: Seguir la cola normal
      if (nuevaCola.length === 0) {
        nuevaCola = generarNuevaCola();
      }
      if (nuevaCola.length > 0) {
        nextItem = nuevaCola[0];
        nuevaCola = nuevaCola.slice(1);
        setColaReproduccion(nuevaCola);
      }
    }

    if (nextItem) {
      setPrevItem(currentItem);
      setCurrentItem(nextItem);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 700); // Duración de la animación CSS
    }
  };

  // 4. Temporizador Automático (8 Segundos para imágenes)
  useEffect(() => {
    // Si no hay item actual pero ya cargaron los datos, arrancar la máquina
    if (!currentItem && archivos.length > 0) {
      avanzar();
      return;
    }

    if (isPaused || !currentItem || currentItem.tipo === 'video') return;
    
    timerRef.current = setTimeout(() => { avanzar(); }, 8000);
    return () => clearTimeout(timerRef.current);
  }, [currentItem, isPaused, interrupciones, archivos.length]);

  // Controles del Operador
  const reiniciar = () => {
    setInterrupciones([]);
    setColaReproduccion(generarNuevaCola());
    setCurrentItem(null); // Fuerzo a que el useEffect lo vuelva a arrancar limpio
    setIsPaused(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  };

  if (cargando) return <div className="min-h-screen bg-black flex items-center justify-center text-white/50 text-2xl tracking-widest uppercase">Conectando...</div>;
  if (archivos.length === 0) return <div className="min-h-screen bg-black flex items-center justify-center text-white/50 text-2xl tracking-widest uppercase">Esperando contenido...</div>;

  return (
    <div 
      className="min-h-screen bg-black flex flex-col font-sans overflow-hidden relative cursor-default select-none"
      onMouseMove={() => { setShowControls(true); clearTimeout(window.controlsTimeout); window.controlsTimeout = setTimeout(() => setShowControls(false), 3000); }}
    >
      {/* CAPA 1: Fondo Difuminado Dinámico */}
      {currentItem && (
        <div 
          className="absolute inset-0 z-0 opacity-40 transition-all duration-1000"
          style={{
            backgroundImage: `url(${currentItem.tipo === 'video' ? '' : currentItem.url})`,
            backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(60px) brightness(0.7) saturate(1.5)',
            transform: 'scale(1.2)'
          }}
        />
      )}

      {/* CAPA 2: Partículas (Estrellitas) */}
      <ParticulasFondo />

      {/* CAPA 3: Contenedor de Medios con Animación de Arrastre */}
      <div className="absolute inset-0 z-10 w-full h-full">
        
        {/* Item Anterior (saliendo) */}
        {prevItem && isAnimating && (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center anim-slide-out p-12">
            {prevItem.tipo === 'video' ? (
              <video src={prevItem.url} className="w-full h-full object-contain drop-shadow-2xl rounded-3xl" />
            ) : (
              <img src={prevItem.url} className="w-full h-full object-contain drop-shadow-2xl rounded-3xl" />
            )}
          </div>
        )}

        {/* Item Actual (entrando / estático) */}
        {currentItem && (
          <div className={`absolute inset-0 w-full h-full flex items-center justify-center p-12 ${isAnimating ? 'anim-slide-in' : ''}`}>
            
            <div className="relative w-full h-full flex items-center justify-center">
              {currentItem.tipo === 'video' ? (
                <video src={currentItem.url} autoPlay muted={!audioHabilitado} playsInline onEnded={avanzar} className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.7)] rounded-3xl border border-white/10" />
              ) : (
                <img src={currentItem.url} className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.7)] rounded-3xl border border-white/10" />
              )}

              {/* Indicadores Minimalistas (Likes y Comentarios) flotando sobre la imagen */}
              <div className="absolute bottom-6 right-6 flex items-center gap-4 bg-black/40 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 shadow-2xl">
                {/* Comentarios */}
                {(currentItem.comentarios || []).length > 0 && (
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-white/90"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    <span className="text-white font-bold text-2xl">{(currentItem.comentarios || []).length}</span>
                  </div>
                )}
                
                {/* Divisor si hay ambos */}
                {(currentItem.comentarios || []).length > 0 && (currentItem.likesArray || []).length > 0 && (
                  <div className="w-px h-8 bg-white/20"></div>
                )}

                {/* Likes */}
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

      {/* CAPA 4: Controles del Operador (Ocultos al no mover el mouse) */}
      <div className={`absolute bottom-10 left-10 z-50 flex gap-4 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <button onClick={() => setIsPaused(!isPaused)} className="w-16 h-16 bg-white/10 backdrop-blur-lg border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition shadow-xl" title={isPaused ? "Reanudar" : "Pausar"}>
          {isPaused ? <span className="text-3xl pl-1">▶</span> : <span className="text-3xl font-black">II</span>}
        </button>
        
        <button onClick={() => setAudioHabilitado(!audioHabilitado)} className={`w-16 h-16 backdrop-blur-lg border rounded-full flex items-center justify-center text-white transition shadow-xl ${audioHabilitado ? 'bg-blue-600/60 border-blue-400 hover:bg-blue-500/80' : 'bg-white/10 border-white/20 hover:bg-white/20'}`} title={audioHabilitado ? "Silenciar" : "Activar Sonido"}>
          {audioHabilitado ? <span className="text-2xl">🔊</span> : <span className="text-2xl">🔇</span>}
        </button>

        <button onClick={reiniciar} className="px-8 h-16 bg-red-600/80 backdrop-blur-lg border border-red-400/50 rounded-full flex items-center justify-center text-white font-bold tracking-widest hover:bg-red-500/80 transition shadow-xl">
          REINICIAR TRANSMISIÓN
        </button>
        
        <button onClick={toggleFullscreen} className="w-16 h-16 bg-white/10 backdrop-blur-lg border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition shadow-xl" title="Pantalla Completa">
          <span className="text-2xl">⛶</span>
        </button>
      </div>

    </div>
  );
}