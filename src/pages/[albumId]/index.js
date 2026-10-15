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

  // --- ESTADOS DE LA CÁMARA WEB ---
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [progresoGrabacion, setProgresoGrabacion] = useState(0); // 0 a 100 (barra que se quema)
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const pressTimer = useRef(null);
  const maxDuracionTimer = useRef(null);
  const intervalProgressRef = useRef(null);

  // SEGUROS DE CONTROL
  const isPressing = useRef(false);
  const grabandoRef = useRef(false);
  const capturandoRef = useRef(false);

  // --- NUEVOS ESTADOS DE VISTA PREVIA Y CONFIRMACIÓN ---
  const [vistaPrevia, setVistaPrevia] = useState(null); // { blob, url, tipo }
  const [comentario, setComentario] = useState('');

  // 1. Cargar datos del álbum
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
  }, [albumId]);

  // 2. Escuchar fotos y videos en tiempo real (con filtrado)
  useEffect(() => {
    if (!albumId) return;
    const q = query(collection(db, 'albums', albumId, 'fotos'), orderBy('creadoEn', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setArchivos(data);
    });
    return () => unsubscribe();
  }, [albumId]);

  // FILTRADO ESTRICTO DE 5 DÍAS
  const archivosValidos = archivos.filter(a => {
    const hace5Dias = Date.now() - 5 * 24 * 60 * 60 * 1000;
    const creado = a.creadoEn?.toMillis 
      ? a.creadoEn.toMillis() 
      : (a.creadoEn ? new Date(a.creadoEn).getTime() : Date.now());
    
    return creado > hace5Dias; // Se borra / oculta pasados los 5 días
  });

  // Historias (Videos < 24hs)
  const historias = archivosValidos.filter(a => {
    if (a.tipo !== 'video') return false;
    const hace24Horas = Date.now() - 24 * 60 * 60 * 1000;
    const creado = a.creadoEn?.toMillis ? a.creadoEn.toMillis() : (a.creadoEn ? new Date(a.creadoEn).getTime() : Date.now());
    return creado > hace24Horas;
  });

  // Muro (Imágenes < 5 días)
  const fotosGrid = archivosValidos.filter(a => a.tipo === 'imagen');

  // --- FUNCIONES DE CÁMARA ---
  const iniciarCamara = async () => {
    setVistaPrevia(null);
    setComentario('');
    setCamaraActiva(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: true
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
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
    
    pressTimer.current = setTimeout(() => {
      if (isPressing.current) {
        iniciarGrabacionVideo();
      }
    }, 450);
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    if (!isPressing.current) return;
    isPressing.current = false;

    if (pressTimer.current) clearTimeout(pressTimer.current);

    if (grabandoRef.current) {
      detenerGrabacionVideo();
    } else {
      if (!capturandoRef.current) {
        capturandoRef.current = true;
        tomarFoto();
      }
    }
  };

  const iniciarGrabacionVideo = () => {
    if (!videoRef.current || !videoRef.current.srcObject || capturandoRef.current) return;
    
    setGrabando(true);
    grabandoRef.current = true;
    capturandoRef.current = true;
    setProgresoGrabacion(0);

    const stream = videoRef.current.srcObject;
    let options = { mimeType: 'video/webm' };
    if (!MediaRecorder.isTypeSupported('video/webm')) {
      options = { mimeType: 'video/mp4' };
    }

    try {
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: options.mimeType });
        guardarEnVistaPrevia(blob, 'video');
      };

      // Control del Indicador de Historia (Rayita que se consume)
      let tiempoActual = 0;
      const limiteMs = 15000;
      const intervaloMs = 100;
      
      intervalProgressRef.current = setInterval(() => {
        tiempoActual += intervaloMs;
        const porcentaje = Math.min((tiempoActual / limiteMs) * 100, 100);
        setProgresoGrabacion(porcentaje);
      }, intervaloMs);

      mediaRecorder.start();

      maxDuracionTimer.current = setTimeout(() => {
        if (grabandoRef.current) {
          detenerGrabacionVideo();
        }
      }, limiteMs);

    } catch(e) {
      console.error(e);
      setGrabando(false);
      grabandoRef.current = false;
      capturandoRef.current = false;
    }
  };

  const detenerGrabacionVideo = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
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
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob(blob => {
      guardarEnVistaPrevia(blob, 'imagen');
    }, 'image/jpeg', 0.85);
  };

  // En lugar de procesar directo, lo mandamos a Vista Previa
  const guardarEnVistaPrevia = (blob, tipo) => {
    const url = URL.createObjectURL(blob);
    setVistaPrevia({ blob, url, tipo });
    detenerCamara(); // Apagamos el hardware de la cámara
  };

  const descartarCaptura = () => {
    if (vistaPrevia?.url) {
      URL.revokeObjectURL(vistaPrevia.url); // Liberar memoria
    }
    setVistaPrevia(null);
    setComentario('');
  };

  const confirmarYSubir = async () => {
    if (!vistaPrevia) return;
    setSubiendo(true);
    const { blob, tipo } = vistaPrevia;

    try {
      const extension = tipo === 'video' ? 'mp4' : 'jpg';
      const nombreArchivo = `${Date.now()}-${Math.random().toString(36).substring(2)}.${extension}`;
      const ruta = storageRef(storage, `eventos/${albumId}/${nombreArchivo}`);
      
      await uploadBytes(ruta, blob);
      const urlDescarga = await getDownloadURL(ruta);

      await addDoc(collection(db, 'albums', albumId, 'fotos'), {
        url: urlDescarga,
        tipo: tipo,
        comentario: tipo === 'imagen' ? comentario.trim() : '', // Solo la foto guarda comentario
        creadoEn: new Date(),
        subidoPor: usuario ? usuario.uid : 'anonimo'
      });

      descartarCaptura();
    } catch (error) {
      console.error(error);
      alert("Error al subir.");
    } finally {
      setSubiendo(false);
    }
  };

  const esAdmin = usuario && album && usuario.uid === album.adminId;
  if (cargando) return <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center font-sans">Cargando...</div>;
  if (!album) return null;

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans overflow-hidden relative">
      
      {/* --- CÁMARA ESTILO INSTAGRAM --- */}
      {camaraActiva && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Indicador superior (barra que se quema) */}
          {grabando && (
            <div className="absolute top-0 left-0 w-full h-1.5 bg-white/20 z-50">
              <div 
                className="h-full bg-red-600 rounded-r-md transition-all ease-linear"
                style={{ width: `${progresoGrabacion}%` }}
              ></div>
            </div>
          )}

          <div className="absolute top-4 w-full p-6 flex justify-between items-center z-50">
            <button onClick={detenerCamara} className="text-white text-4xl font-light hover:text-gray-300">×</button>
            {grabando && (
              <div className="bg-red-600 px-3 py-1 rounded-full text-white text-[10px] font-bold animate-pulse flex items-center gap-1.5 shadow-lg">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span> HISTORIA (MAX 15S)
              </div>
            )}
          </div>
          
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover bg-gray-900" />
          
          <div className="absolute bottom-12 w-full flex flex-col items-center justify-center z-50">
            <p className="text-white text-[10px] opacity-75 mb-4 tracking-[0.25em] font-bold uppercase drop-shadow-md">
              Toque: Foto • Mantener: Historia
            </p>
            <button
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onContextMenu={(e) => e.preventDefault()}
              style={{ touchAction: 'none' }}
              className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${grabando ? 'border-red-500 scale-110' : 'border-white'}`}
            >
              <div className={`bg-white transition-all duration-300 ${grabando ? 'w-8 h-8 rounded bg-red-500' : 'w-16 h-16 rounded-full'}`}></div>
            </button>
          </div>
        </div>
      )}

      {/* --- PANTALLA DE VISTA PREVIA Y CONFIRMACIÓN --- */}
      {vistaPrevia && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col justify-between p-6">
          
          {/* Contenido Capturado */}
          <div className="flex-1 w-full flex items-center justify-center rounded-3xl overflow-hidden relative bg-zinc-900 shadow-2xl">
            {vistaPrevia.tipo === 'video' ? (
              <video src={vistaPrevia.url} autoPlay loop playsInline className="w-full h-full object-cover" />
            ) : (
              <img src={vistaPrevia.url} alt="Previa" className="w-full h-full object-cover" />
            )}
            
            {/* Overlay para foto (comentario) */}
            {vistaPrevia.tipo === 'imagen' && (
              <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <input
                  type="text"
                  placeholder="Escribe un comentario..."
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  className="w-full bg-white/20 hover:bg-white/30 focus:bg-white/40 text-white placeholder-white/70 font-medium px-5 py-4 rounded-2xl outline-none border border-white/25 backdrop-blur-md transition-all text-sm"
                />
              </div>
            )}
          </div>

          {/* Botonera inferior */}
          <div className="flex justify-between gap-4 mt-6">
            <button
              onClick={descartarCaptura}
              disabled={subiendo}
              className="flex-1 py-4.5 bg-zinc-800 text-white font-bold rounded-2xl hover:bg-zinc-700 transition"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarYSubir}
              disabled={subiendo}
              className={`flex-1 py-4.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition flex items-center justify-center gap-2 ${subiendo ? 'opacity-60' : ''}`}
            >
              {subiendo ? 'Guardando...' : 'Confirmar y subir'}
            </button>
          </div>

        </div>
      )}

      {/* --- CABECERA Y HISTORIAS --- */}
      <header className="bg-white pt-4 pb-5 shadow-sm sticky top-0 z-10 rounded-b-[2rem] flex flex-col">
        <div className="flex items-center justify-between px-6">
          <button onClick={() => router.push('/')} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100">←</button>
          <div className="flex flex-col items-center flex-1 px-2 overflow-hidden">
            <h1 className="text-xl font-serif text-black truncate w-full text-center">{album.nombreEvento}</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1 font-medium">{album.fechaEvento}</p>
          </div>
          <button onClick={() => setMenuAbierto(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-600 pb-2 text-2xl">⋮</button>
        </div>

        {/* Carrusel de Historias Reales - Desaparecen tras 24hs o 5 días del evento */}
        {historias.length > 0 && (
          <div className="flex gap-3 overflow-x-auto mt-6 px-6 pb-2 [&::-webkit-scrollbar]:hidden">
            {historias.map(historia => (
              <div key={historia.id} className="flex-shrink-0 relative rounded-[16px] p-[2px] bg-blue-500 animate-fade-in">
                <div className="w-14 h-20 bg-black rounded-[14px] overflow-hidden border-[2px] border-white relative flex items-center justify-center">
                  <video src={historia.url} className="w-full h-full object-cover opacity-80" playsInline muted />
                  <span className="absolute text-white text-xs">▶</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* --- MURO DE FOTOS (Cuadrícula) --- */}
      <main className="flex-1 p-6 overflow-y-auto pb-32">
        {fotosGrid.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 mt-10">
            <div className="text-6xl mb-4 opacity-30">📷</div>
            <p className="text-sm font-medium">Aún no hay fotos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 auto-rows-fr">
            {fotosGrid.map((foto) => (
              <div key={foto.id} className="flex flex-col relative rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm transition-all pb-3">
                <div className="relative aspect-square w-full overflow-hidden bg-gray-200">
                  <img src={foto.url} className="w-full h-full object-cover" loading="lazy" />
                </div>
                {/* Comentario si existe */}
                {foto.comentario && (
                  <p className="text-xs text-gray-600 px-3 mt-2 line-clamp-2 leading-relaxed italic font-sans font-light">
                    "{foto.comentario}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* --- BOTÓN FLOTANTE --- */}
      <div className="fixed bottom-10 w-full flex justify-center z-20 pointer-events-none">
        <button 
          onClick={iniciarCamara}
          disabled={subiendo}
          className={`pointer-events-auto bg-blue-600 text-white w-16 h-16 rounded-full shadow-[0_10px_25px_rgba(37,99,235,0.4)] flex items-center justify-center text-4xl pb-1 hover:bg-blue-700 transition transform ${subiendo ? 'opacity-50 scale-95' : 'hover:-translate-y-1'}`}
        >
          {subiendo ? <span className="text-lg">⏳</span> : '+'}
        </button>
      </div>

    </div>
  );
}