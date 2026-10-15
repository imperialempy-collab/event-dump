const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const muroCode = `
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../firebase/config';
import { doc, getDoc, collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuthContext } from '../../context/AuthContext';

export default function MuroEvento() {
  const router = useRouter();
  const { albumId } = router.query;
  const { usuario } = useAuthContext();
  
  const [album, setAlbum] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [archivos, setArchivos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);

  // --- ESTADOS DE CÁMARA Y GRABACIÓN ---
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [progresoGrabacion, setProgresoGrabacion] = useState(0); 
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const pressTimer = useRef(null);
  const maxDuracionTimer = useRef(null);
  const intervalProgressRef = useRef(null);
  const isPressing = useRef(false);
  const grabandoRef = useRef(false);
  const capturandoRef = useRef(false);

  // --- ESTADOS DE VISTA PREVIA ---
  const [vistaPrevia, setVistaPrevia] = useState(null);
  const [comentario, setComentario] = useState('');

  // --- NUEVOS ESTADOS: VISORES DE GALERÍA Y HISTORIAS ---
  const [historiasVistas, setHistoriasVistas] = useState([]);
  const [historiaActivaIndex, setHistoriaActivaIndex] = useState(null);
  const [fotoActivaIndex, setFotoActivaIndex] = useState(null);

  // 1. Cargar datos del álbum y las historias vistas en este celular
  useEffect(() => {
    if (!albumId) return;
    const cargarDatos = async () => {
      try {
        const docRef = doc(db, 'albums', albumId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setAlbum(docSnap.data());
        setCargando(false);
      } catch (error) {
        console.error("Error", error);
        setCargando(false);
      }
    };
    cargarDatos();

    // Recuperar del celular qué historias ya se vieron
    const vistasGuardadas = localStorage.getItem('historiasVistas_\${albumId}');
    if (vistasGuardadas) {
      setHistoriasVistas(JSON.parse(vistasGuardadas));
    }
  }, [albumId]);

  // 2. Escuchar fotos y videos
  useEffect(() => {
    if (!albumId) return;
    const q = query(collection(db, 'albums', albumId, 'fotos'), orderBy('creadoEn', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setArchivos(data);
    });
    return () => unsubscribe();
  }, [albumId]);

  // 3. FILTRADO (5 Días máximo)
  const getTime = (item) => item.creadoEn?.toMillis ? item.creadoEn.toMillis() : (item.creadoEn ? new Date(item.creadoEn).getTime() : 0);

  const archivosValidos = archivos.filter(a => {
    const hace5Dias = Date.now() - 5 * 24 * 60 * 60 * 1000;
    return getTime(a) > hace5Dias;
  });

  const fotosGrid = archivosValidos.filter(a => a.tipo === 'imagen');
  
  const historias = archivosValidos.filter(a => {
    if (a.tipo !== 'video') return false;
    const hace24Horas = Date.now() - 24 * 60 * 60 * 1000;
    return getTime(a) > hace24Horas;
  });

  // 4. ORDENAR HISTORIAS (Nuevas primero, Vistas al fondo)
  const historiasOrdenadas = [...historias].sort((a, b) => {
    const aVisto = historiasVistas.includes(a.id);
    const bVisto = historiasVistas.includes(b.id);
    if (aVisto === bVisto) return getTime(b) - getTime(a);
    return aVisto ? 1 : -1;
  });

  // --- LÓGICA DEL VISOR DE HISTORIAS ---
  const abrirHistoria = (index) => {
    const id = historiasOrdenadas[index].id;
    if (!historiasVistas.includes(id)) {
      const nuevasVistas = [...historiasVistas, id];
      setHistoriasVistas(nuevasVistas);
      localStorage.setItem('historiasVistas_\${albumId}', JSON.stringify(nuevasVistas));
    }
    setHistoriaActivaIndex(index);
  };

  const avanzarHistoria = () => {
    if (historiaActivaIndex !== null && historiaActivaIndex < historiasOrdenadas.length - 1) {
      abrirHistoria(historiaActivaIndex + 1);
    } else {
      setHistoriaActivaIndex(null); // Cierra si era la última
    }
  };

  const retrocederHistoria = () => {
    if (historiaActivaIndex !== null && historiaActivaIndex > 0) {
      abrirHistoria(historiaActivaIndex - 1);
    }
  };

  // --- LÓGICA DEL VISOR DE FOTOS ---
  const abrirFoto = (index) => setFotoActivaIndex(index);
  const cerrarFoto = () => setFotoActivaIndex(null);
  const avanzarFoto = (e) => { e.stopPropagation(); if (fotoActivaIndex < fotosGrid.length - 1) setFotoActivaIndex(fotoActivaIndex + 1); };
  const retrocederFoto = (e) => { e.stopPropagation(); if (fotoActivaIndex > 0) setFotoActivaIndex(fotoActivaIndex - 1); };

  // --- FUNCIONES DE CÁMARA (Sin cambios) ---
  const iniciarCamara = async () => {
    setVistaPrevia(null);
    setComentario('');
    setCamaraActiva(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error(err);
      alert("Necesitas dar permiso de cámara y micrófono.");
      setCamaraActiva(false);
    }
  };

  const detenerCamara = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setCamaraActiva(false);
    setGrabando(false);
    grabandoRef.current = false;
    capturandoRef.current = false;
    setProgresoGrabacion(0);
    if (maxDuracionTimer.current) clearTimeout(maxDuracionTimer.current);
    if (intervalProgressRef.current) clearInterval(intervalProgressRef.current);
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    if (capturandoRef.current || isPressing.current) return;
    isPressing.current = true;
    chunksRef.current = [];
    pressTimer.current = setTimeout(() => { if (isPressing.current) iniciarGrabacionVideo(); }, 450);
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    if (!isPressing.current) return;
    isPressing.current = false;
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (grabandoRef.current) detenerGrabacionVideo();
    else if (!capturandoRef.current) { capturandoRef.current = true; tomarFoto(); }
  };

  const iniciarGrabacionVideo = () => {
    if (!videoRef.current || !videoRef.current.srcObject || capturandoRef.current) return;
    setGrabando(true);
    grabandoRef.current = true;
    capturandoRef.current = true;
    setProgresoGrabacion(0);

    const stream = videoRef.current.srcObject;
    let options = { mimeType: 'video/webm' };
    if (!MediaRecorder.isTypeSupported('video/webm')) options = { mimeType: 'video/mp4' };

    try {
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => guardarEnVistaPrevia(new Blob(chunksRef.current, { type: options.mimeType }), 'video');

      let tiempoActual = 0;
      intervalProgressRef.current = setInterval(() => {
        tiempoActual += 100;
        setProgresoGrabacion(Math.min((tiempoActual / 15000) * 100, 100));
      }, 100);

      mediaRecorder.start();
      maxDuracionTimer.current = setTimeout(() => { if (grabandoRef.current) detenerGrabacionVideo(); }, 15000);
    } catch(e) {
      setGrabando(false);
      grabandoRef.current = false;
      capturandoRef.current = false;
    }
  };

  const detenerGrabacionVideo = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') mediaRecorderRef.current.stop();
    setGrabando(false);
    grabandoRef.current = false;
    if (maxDuracionTimer.current) clearTimeout(maxDuracionTimer.current);
    if (intervalProgressRef.current) clearInterval(intervalProgressRef.current);
  };

  const tomarFoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => guardarEnVistaPrevia(blob, 'imagen'), 'image/jpeg', 0.85);
  };

  const guardarEnVistaPrevia = (blob, tipo) => {
    setVistaPrevia({ blob, url: URL.createObjectURL(blob), tipo });
    detenerCamara();
  };

  const descartarCaptura = () => {
    if (vistaPrevia?.url) URL.revokeObjectURL(vistaPrevia.url);
    setVistaPrevia(null);
    setComentario('');
  };

  const confirmarYSubir = async () => {
    if (!vistaPrevia) return;
    setSubiendo(true);
    const { blob, tipo } = vistaPrevia;
    try {
      const ruta = storageRef(storage, \`eventos/\${albumId}/\${Date.now()}.\${tipo === 'video' ? 'mp4' : 'jpg'}\`);
      await uploadBytes(ruta, blob);
      const urlDescarga = await getDownloadURL(ruta);
      await addDoc(collection(db, 'albums', albumId, 'fotos'), {
        url: urlDescarga, tipo, comentario: tipo === 'imagen' ? comentario.trim() : '', creadoEn: new Date(), subidoPor: usuario ? usuario.uid : 'anonimo'
      });
      descartarCaptura();
    } catch (error) { alert("Error al subir."); } finally { setSubiendo(false); }
  };

  if (cargando) return <div className="min-h-screen flex items-center justify-center font-sans">Cargando...</div>;
  if (!album) return null;

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans overflow-hidden relative">
      
      {/* --- VISOR DE HISTORIAS A PANTALLA COMPLETA --- */}
      {historiaActivaIndex !== null && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col">
          {/* Barra superior de progreso de historias */}
          <div className="absolute top-0 w-full p-4 pt-6 flex flex-col gap-3 z-[110] bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex gap-1 w-full">
              {historiasOrdenadas.map((_, i) => (
                <div key={i} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                  <div className={\`h-full \${i === historiaActivaIndex ? 'bg-white' : i < historiaActivaIndex ? 'bg-white' : ''}\`}></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center px-1">
              <span className="text-white text-xs font-bold tracking-widest uppercase">Historia</span>
              <button onClick={() => setHistoriaActivaIndex(null)} className="text-white text-3xl font-light leading-none">×</button>
            </div>
          </div>

          <video 
            src={historiasOrdenadas[historiaActivaIndex].url} 
            autoPlay 
            playsInline 
            onEnded={avanzarHistoria}
            className="w-full h-full object-cover"
          />

          {/* Botones invisibles para tocar izquierda/derecha */}
          <div className="absolute inset-y-0 left-0 w-1/3 z-[100]" onClick={retrocederHistoria}></div>
          <div className="absolute inset-y-0 right-0 w-2/3 z-[100]" onClick={avanzarHistoria}></div>
        </div>
      )}

      {/* --- VISOR DE FOTOGRAFÍAS A PANTALLA COMPLETA --- */}
      {fotoActivaIndex !== null && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center backdrop-blur-sm">
          <button onClick={cerrarFoto} className="absolute top-6 right-6 text-white text-4xl font-light z-[110] w-12 h-12 flex items-center justify-center bg-black/20 rounded-full">×</button>
          
          <div className="relative w-full h-full flex items-center justify-center">
            <img src={fotosGrid[fotoActivaIndex].url} className="max-w-full max-h-full object-contain" alt="Visor" />
            
            {fotoActivaIndex > 0 && (
              <button onClick={retrocederFoto} className="absolute left-4 text-white text-4xl bg-black/40 rounded-full w-12 h-12 flex items-center justify-center pb-2 z-[110] hover:bg-black/60">‹</button>
            )}
            {fotoActivaIndex < fotosGrid.length - 1 && (
              <button onClick={avanzarFoto} className="absolute right-4 text-white text-4xl bg-black/40 rounded-full w-12 h-12 flex items-center justify-center pb-2 z-[110] hover:bg-black/60">›</button>
            )}

            {fotosGrid[fotoActivaIndex].comentario && (
              <div className="absolute bottom-0 left-0 w-full p-8 pt-20 bg-gradient-to-t from-black via-black/80 to-transparent">
                <p className="text-white text-center leading-relaxed font-light text-lg">
                  {fotosGrid[fotoActivaIndex].comentario}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- CÁMARA --- */}
      {camaraActiva && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {grabando && (
            <div className="absolute top-0 left-0 w-full h-1.5 bg-white/20 z-50">
              <div className="h-full bg-red-600 rounded-r-md transition-all ease-linear" style={{ width: \`\${progresoGrabacion}%\` }}></div>
            </div>
          )}
          <div className="absolute top-4 w-full p-6 flex justify-between items-center z-50">
            <button onClick={detenerCamara} className="text-white text-4xl font-light">×</button>
            {grabando && <div className="bg-red-600 px-3 py-1 rounded-full text-white text-[10px] font-bold animate-pulse flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-white rounded-full"></span> HISTORIA (MAX 15S)</div>}
          </div>
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover bg-gray-900" />
          <div className="absolute bottom-12 w-full flex flex-col items-center justify-center z-50">
            <p className="text-white text-[10px] opacity-75 mb-4 tracking-[0.25em] font-bold uppercase drop-shadow-md">Toque: Foto • Mantener: Historia</p>
            <button onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} onContextMenu={(e) => e.preventDefault()} style={{ touchAction: 'none' }} className={\`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-300 \${grabando ? 'border-red-500 scale-110' : 'border-white'}\`}>
              <div className={\`bg-white transition-all duration-300 \${grabando ? 'w-8 h-8 rounded bg-red-500' : 'w-16 h-16 rounded-full'}\`}></div>
            </button>
          </div>
        </div>
      )}

      {/* --- VISTA PREVIA --- */}
      {vistaPrevia && (
        <div className="fixed inset-0 bg-black z-[80] flex flex-col justify-between p-6">
          <div className="flex-1 w-full flex items-center justify-center rounded-3xl overflow-hidden relative bg-zinc-900 shadow-2xl">
            {vistaPrevia.tipo === 'video' ? <video src={vistaPrevia.url} autoPlay loop playsInline className="w-full h-full object-cover" /> : <img src={vistaPrevia.url} className="w-full h-full object-cover" />}
            {vistaPrevia.tipo === 'imagen' && (
              <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <input type="text" placeholder="Escribe un comentario..." value={comentario} onChange={(e) => setComentario(e.target.value)} className="w-full bg-white/20 text-white placeholder-white/70 font-medium px-5 py-4 rounded-2xl outline-none border border-white/25 backdrop-blur-md transition-all text-sm" />
              </div>
            )}
          </div>
          <div className="flex justify-between gap-4 mt-6">
            <button onClick={descartarCaptura} disabled={subiendo} className="flex-1 py-4.5 bg-zinc-800 text-white font-bold rounded-2xl">Cancelar</button>
            <button onClick={confirmarYSubir} disabled={subiendo} className={\`flex-1 py-4.5 bg-blue-600 text-white font-bold rounded-2xl \${subiendo ? 'opacity-60' : ''}\`}>{subiendo ? 'Guardando...' : 'Confirmar y subir'}</button>
          </div>
        </div>
      )}

      {/* --- CABECERA (Historias) --- */}
      <header className="bg-white pt-4 pb-5 shadow-sm sticky top-0 z-10 rounded-b-[2rem] flex flex-col">
        <div className="flex items-center justify-between px-6">
          <button onClick={() => router.push('/')} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-600">←</button>
          <div className="flex flex-col items-center flex-1 px-2 overflow-hidden">
            <h1 className="text-xl font-serif text-black truncate w-full text-center">{album.nombreEvento}</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1 font-medium">{album.fechaEvento}</p>
          </div>
          <button onClick={() => setMenuAbierto(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-600 pb-2 text-2xl">⋮</button>
        </div>

        {historiasOrdenadas.length > 0 && (
          <div className="flex gap-3 overflow-x-auto mt-6 px-6 pb-2 [&::-webkit-scrollbar]:hidden">
            {historiasOrdenadas.map((historia, index) => {
              const visto = historiasVistas.includes(historia.id);
              return (
                <button key={historia.id} onClick={() => abrirHistoria(index)} className={\`flex-shrink-0 relative rounded-[16px] p-[2px] transition-all transform hover:scale-95 \${visto ? 'bg-gray-300' : 'bg-blue-500'}\`}>
                  <div className="w-14 h-20 bg-black rounded-[14px] overflow-hidden border-[2px] border-white relative flex items-center justify-center">
                    <video src={historia.url} className={\`w-full h-full object-cover transition-opacity duration-300 \${visto ? 'opacity-50' : 'opacity-80'}\`} />
                    {!visto && <span className="absolute bottom-1 bg-black/60 text-white px-1.5 py-0.5 rounded text-[8px] font-bold tracking-widest">NUEVO</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* --- MURO (Fotos) --- */}
      <main className="flex-1 p-6 overflow-y-auto pb-32">
        {fotosGrid.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 mt-10"><div className="text-6xl mb-4 opacity-30">📷</div><p className="text-sm font-medium">Aún no hay fotos.</p></div>
        ) : (
          <div className="grid grid-cols-2 gap-4 auto-rows-fr">
            {fotosGrid.map((foto, index) => (
              <button key={foto.id} onClick={() => abrirFoto(index)} className="flex flex-col relative rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm transition-all pb-3 text-left hover:shadow-md hover:-translate-y-0.5">
                <div className="relative aspect-square w-full overflow-hidden bg-gray-200">
                  <img src={foto.url} className="w-full h-full object-cover" loading="lazy" />
                </div>
                {foto.comentario && <p className="text-xs text-gray-600 px-3 mt-2 line-clamp-2 leading-relaxed italic font-sans font-light">"{foto.comentario}"</p>}
              </button>
            ))}
          </div>
        )}
      </main>

      <div className="fixed bottom-10 w-full flex justify-center z-20 pointer-events-none">
        <button onClick={iniciarCamara} disabled={subiendo} className={\`pointer-events-auto bg-blue-600 text-white w-16 h-16 rounded-full shadow-[0_10px_25px_rgba(37,99,235,0.4)] flex items-center justify-center text-4xl pb-1 hover:bg-blue-700 transition transform \${subiendo ? 'opacity-50 scale-95' : 'hover:-translate-y-1'}\`}>{subiendo ? <span className="text-lg">⏳</span> : '+'}</button>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(__dirname, 'src/pages/[albumId]/index.js'), muroCode.trim());

console.log("✅ Implementado: Visores de Pantalla Completa y Estado de Visualización. Subiendo a GitHub...");
try {
  execSync('git add . && git commit -m "Agregado visor de historias con progresion y galeria interactiva de fotos" && git push origin main', { stdio: 'inherit' });
  console.log("🚀 ¡Actualización completada! Espera que Vercel termine el despliegue.");
} catch (err) {
  console.error("Error subiendo a GitHub:", err);
}