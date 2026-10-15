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

  // --- ESTADOS DE LA CÁMARA WEB ---
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [grabando, setGrabando] = useState(false);
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const pressTimer = useRef(null);
  const maxDuracionTimer = useRef(null);

  // SEGUROS DE CONTROL (Evitan doble disparos y mezcla de estados)
  const isPressing = useRef(false);
  const grabandoRef = useRef(false); // Para leer al instante sin retrasos de React
  const capturandoRef = useRef(false); // Evita procesar foto y video a la vez

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

  // 2. Escuchar fotos y videos en tiempo real
  useEffect(() => {
    if (!albumId) return;
    const q = query(collection(db, 'albums', albumId, 'fotos'), orderBy('creadoEn', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setArchivos(data);
    });
    return () => unsubscribe();
  }, [albumId]);

  // FILTRADO SEGURO
  // Historias (Videos) -> Desaparecen automáticamente después de 24 horas ("Durar poco")
  const historias = archivos.filter(a => {
    if (a.tipo !== 'video') return false;
    
    // Filtro temporal: 24 horas
    const hace24Horas = Date.now() - 24 * 60 * 60 * 1000;
    const creado = a.creadoEn?.toMillis 
      ? a.creadoEn.toMillis() 
      : (a.creadoEn ? new Date(a.creadoEn).getTime() : Date.now());
    
    return creado > hace24Horas;
  });

  // Muro (Imágenes únicamente)
  const fotosGrid = archivos.filter(a => a.tipo === 'imagen');

  // --- FUNCIONES DE CÁMARA ESTILO INSTAGRAM ---
  const iniciarCamara = async () => {
    setCamaraActiva(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Cámara trasera
        audio: true
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      alert("Necesitas dar permiso de cámara y micrófono en tu navegador.");
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
    if (maxDuracionTimer.current) clearTimeout(maxDuracionTimer.current);
  };

  // Manejador del toque inicial
  const handlePointerDown = (e) => {
    e.preventDefault();
    if (capturandoRef.current || isPressing.current) return;
    
    isPressing.current = true;
    chunksRef.current = [];
    
    // Programamos el chequeo de "Mantener presionado"
    pressTimer.current = setTimeout(() => {
      if (isPressing.current) {
        iniciarGrabacionVideo();
      }
    }, 450); // Presionado por casi medio segundo inicia historia (video)
  };

  // Manejador al levantar el dedo
  const handlePointerUp = (e) => {
    e.preventDefault();
    if (!isPressing.current) return;
    isPressing.current = false;

    // Cancelar el chequeo del temporizador
    if (pressTimer.current) clearTimeout(pressTimer.current);

    if (grabandoRef.current) {
      // Detener grabación de video de forma segura
      detenerGrabacionVideo();
    } else {
      // Si no estaba grabando y el dedo se levantó rápido: TOMAR FOTO
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
    capturandoRef.current = true; // Bloquea cualquier intento de foto

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
        procesarArchivo(new Blob(chunksRef.current, { type: options.mimeType }), 'video');
      };
      mediaRecorder.start();

      // "HISTORIA DEBE DURAR POCO": Toque de límite de 15 segundos
      maxDuracionTimer.current = setTimeout(() => {
        if (grabandoRef.current) {
          detenerGrabacionVideo();
        }
      }, 15000); // 15 segundos máximo

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
  };

  const tomarFoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob(blob => {
      procesarArchivo(blob, 'imagen');
    }, 'image/jpeg', 0.8);
  };

  const procesarArchivo = async (blob, tipo) => {
    detenerCamara();
    setSubiendo(true);
    try {
      const extension = tipo === 'video' ? 'mp4' : 'jpg';
      const nombreArchivo = \`\${Date.now()}-\${Math.random().toString(36).substring(2)}.\${extension}\`;
      const ruta = storageRef(storage, \`eventos/\${albumId}/\${nombreArchivo}\`);
      
      await uploadBytes(ruta, blob);
      const urlDescarga = await getDownloadURL(ruta);

      await addDoc(collection(db, 'albums', albumId, 'fotos'), {
        url: urlDescarga,
        tipo: tipo,
        creadoEn: new Date(),
        subidoPor: usuario ? usuario.uid : 'anonimo'
      });
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
      
      {/* --- CÁMARA ESTILO INSTAGRAM (Overlay a pantalla completa) --- */}
      {camaraActiva && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="absolute top-0 w-full p-6 flex justify-between items-center z-50">
            <button onClick={detenerCamara} className="text-white text-4xl font-light hover:text-gray-300">×</button>
            {grabando && (
              <div className="bg-red-600 px-3 py-1 rounded-full text-white text-xs font-bold animate-pulse flex items-center gap-2 shadow-lg">
                <span className="w-2 h-2 bg-white rounded-full"></span> HISTORIA (MAX 15S)
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
              className={\`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-300 \${grabando ? 'border-red-500 scale-110' : 'border-white'}\`}
            >
              <div className={\`bg-white transition-all duration-300 \${grabando ? 'w-8 h-8 rounded bg-red-500' : 'w-16 h-16 rounded-full'}\`}></div>
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

        {/* Carrusel de Historias Reales - Desaparecen tras 24hs ("Durar poco") */}
        {historias.length > 0 && (
          <div className="flex gap-3 overflow-x-auto mt-6 px-6 pb-2 [&::-webkit-scrollbar]:hidden">
            {historias.map(historia => (
              <div key={historia.id} className="flex-shrink-0 relative rounded-[16px] p-[2px] bg-blue-500">
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
          <div className="grid grid-cols-2 gap-4 auto-rows-[200px]">
            {fotosGrid.map((foto) => (
              <div key={foto.id} className="relative rounded-2xl overflow-hidden bg-gray-200">
                <img src={foto.url} className="w-full h-full object-cover" loading="lazy" />
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
          className={\`pointer-events-auto bg-blue-600 text-white w-16 h-16 rounded-full shadow-[0_10px_25px_rgba(37,99,235,0.4)] flex items-center justify-center text-4xl pb-1 hover:bg-blue-700 transition transform \${subiendo ? 'opacity-50 scale-95' : 'hover:-translate-y-1'}\`}
        >
          {subiendo ? <span className="text-lg">⏳</span> : '+'}
        </button>
      </div>

    </div>
  );
}
`;

fs.writeFileSync(path.join(__dirname, 'src/pages/[albumId]/index.js'), muroCode.trim());

console.log("✅ Asegurando control Muro/Historias y caducidad temporal. Subiendo a GitHub...");
try {
  execSync('git add . && git commit -m "Solucion de doble disparo camara, aislamiento estricto muro/historias y duracion" && git push origin main', { stdio: 'inherit' });
  console.log("🚀 ¡Subida completada! Espera que Vercel actualice tu servidor.");
} catch (err) {
  console.error("Error subiendo a GitHub:", err);
}