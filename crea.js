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

  // --- ESTADOS DE CÁMARA Y HARDWARE ---
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [modoCamara, setModoCamara] = useState('historia'); // 'historia' o 'videoMuro'
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (trasera) o 'user' (selfie)
  const [flashEncendido, setFlashEncendido] = useState(false);
  const [soportaFlashWeb, setSoportaFlashWeb] = useState(false);

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

  // Inputs nativos ocultos para soporte iOS con Flash y selección estricta
  const iosPhotoInputRef = useRef(null);
  const iosVideoInputRef = useRef(null);

  // --- ESTADOS DE VISTA PREVIA Y VISORES ---
  const [vistaPrevia, setVistaPrevia] = useState(null);
  const [comentario, setComentario] = useState('');
  const [historiasVistas, setHistoriasVistas] = useState([]);
  const [visorHistorias, setVisorHistorias] = useState(null);
  const [videoProgreso, setVideoProgreso] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartRef = useRef({ x: 0, y: 0 });

  const [itemActivoIndex, setItemActivoIndex] = useState(null);
  const [muroSwipeOffset, setMuroSwipeOffset] = useState({ x: 0, y: 0 });
  const [isSwipingMuro, setIsSwipingMuro] = useState(false);
  const muroTouchStartRef = useRef({ x: 0, y: 0, ignore: false });

  useEffect(() => {
    if (!albumId) return;
    const cargarDatos = async () => {
      try {
        const docRef = doc(db, 'albums', albumId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setAlbum(docSnap.data());
        setCargando(false);
      } catch (error) { console.error(error); setCargando(false); }
    };
    cargarDatos();
    const vistasGuardadas = localStorage.getItem('historiasVistas_' + albumId);
    if (vistasGuardadas) setHistoriasVistas(JSON.parse(vistasGuardadas));
  }, [albumId]);

  useEffect(() => {
    if (!albumId) return;
    const q = query(collection(db, 'albums', albumId, 'fotos'), orderBy('creadoEn', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setArchivos(data);
    });
    return () => unsubscribe();
  }, [albumId]);

  const getTime = (item) => item.creadoEn?.toMillis ? item.creadoEn.toMillis() : (item.creadoEn ? new Date(item.creadoEn).getTime() : 0);

  const archivosValidos = archivos.filter(a => (Date.now() - 5 * 24 * 60 * 60 * 1000) < getTime(a));
  const itemsMuro = archivosValidos.filter(a => a.tipo === 'imagen' || a.destino === 'muro');
  
  const historias = archivosValidos.filter(a => {
    if (a.tipo !== 'video' || a.destino === 'muro') return false;
    return getTime(a) > (Date.now() - 24 * 60 * 60 * 1000);
  });

  const historiasOrdenadas = [...historias].sort((a, b) => {
    const aVisto = historiasVistas.includes(a.id);
    const bVisto = historiasVistas.includes(b.id);
    if (aVisto === bVisto) return getTime(b) - getTime(a);
    return aVisto ? 1 : -1;
  });

  // --- GESTIÓN DE CÁMARA Y HARDWARE (Linterna y Selfie) ---
  const iniciarCamara = async (nuevoFacing = facingMode) => {
    setVistaPrevia(null);
    setComentario('');
    setCamaraActiva(true);
    setFlashEncendido(false);

    try {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }

      const constraints = {
        video: { facingMode: nuevoFacing },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Comprobar soporte de linterna (Torch) para Android / Navegadores compatibles
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        setSoportaFlashWeb(true);
      } else {
        setSoportaFlashWeb(false);
      }

    } catch (err) {
      console.log("Cámara web avanzada no disponible, usando alternativa.", err);
    }
  };

  const cambiarCamaraSelfie = () => {
    const nuevoFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nuevoFacing);
    if (nuevoFacing === 'user') setFlashEncendido(false); // La selfie no usa flash web
    iniciarCamara(nuevoFacing);
  };

  const toggleFlashWeb = async () => {
    // Detección de iOS (Safari)
    const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (esIOS) {
      // Estrategia híbrida para iOS: Activamos los inputs nativos con flash forzado
      if (modoCamara === 'historia') {
        // Permitir elegir entre Foto o Historia en iOS con flash
        const elegirVideo = confirm("¿Deseas grabar una Historia (Video) con Flash? Acepta para video, Cancela para foto.");
        if (elegirVideo) {
          iosVideoInputRef.current.click();
        } else {
          iosPhotoInputRef.current.click();
        }
      } else {
        iosVideoInputRef.current.click(); // Video muro nativo iOS
      }
      return;
    }

    // Estrategia para Android / Web Estándar
    if (!videoRef.current || !videoRef.current.srcObject) return;
    const track = videoRef.current.srcObject.getVideoTracks()[0];
    
    try {
      const nuevoEstado = !flashEncendido;
      await track.applyConstraints({
        advanced: [{ torch: nuevoEstado }]
      });
      setFlashEncendido(nuevoEstado);
    } catch (e) {
      console.error("Error aplicando linterna:", e);
      alert("Tu dispositivo no permite controlar la linterna desde el navegador web.");
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
    setFlashEncendido(false);
    if (maxDuracionTimer.current) clearTimeout(maxDuracionTimer.current);
    if (intervalProgressRef.current) clearInterval(intervalProgressRef.current);
  };

  // Captura desde input nativo (Para iOS con Flash garantizado)
  const handleSeleccionArchivoNativo = async (e, tipoArchivo, destinoArchivo) => {
    const file = e.target.files[0];
    if (!file) return;
    detenerCamara();
    guardarEnVistaPrevia(file, tipoArchivo, destinoArchivo);
    e.target.value = null;
  };

  // --- LÓGICA DE GRABACIÓN Y BOTONES DE CÁMARA ---
  const handleCamPointerDown = (e) => {
    e.preventDefault();
    if (modoCamara === 'videoMuro') {
      if (grabandoRef.current) { detenerGrabacionVideo(); return; }
      if (capturandoRef.current || isPressing.current) return;
      iniciarGrabacionVideo('muro');
      return;
    } 
    if (capturandoRef.current || isPressing.current) return;
    isPressing.current = true;
    chunksRef.current = [];
    pressTimer.current = setTimeout(() => { if (isPressing.current) iniciarGrabacionVideo('historia'); }, 450);
  };

  const handleCamPointerUp = (e) => {
    e.preventDefault();
    if (modoCamara === 'videoMuro') return; 
    if (!isPressing.current) return;
    isPressing.current = false;
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (grabandoRef.current) detenerGrabacionVideo();
    else if (!capturandoRef.current) { capturandoRef.current = true; tomarFoto(); }
  };

  const iniciarGrabacionVideo = (destinoDest) => {
    if (!videoRef.current || !videoRef.current.srcObject || capturandoRef.current) return;
    setGrabando(true);
    grabandoRef.current = true;
    capturandoRef.current = true;
    setProgresoGrabacion(0);

    const stream = videoRef.current.srcObject;
    let options = { mimeType: 'video/webm' };
    if (!MediaRecorder.isTypeSupported('video/webm')) options = { mimeType: 'video/mp4' };
    const limiteMs = destinoDest === 'historia' ? 10000 : 20000;

    try {
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => guardarEnVistaPrevia(new Blob(chunksRef.current, { type: options.mimeType }), 'video', destinoDest);

      let tiempoActual = 0;
      intervalProgressRef.current = setInterval(() => {
        tiempoActual += 100;
        setProgresoGrabacion(Math.min((tiempoActual / limiteMs) * 100, 100));
      }, 100);

      mediaRecorder.start();
      maxDuracionTimer.current = setTimeout(() => { if (grabandoRef.current) detenerGrabacionVideo(); }, limiteMs);
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
    canvas.toBlob(blob => guardarEnVistaPrevia(blob, 'imagen', 'muro'), 'image/jpeg', 0.85);
  };

  const guardarEnVistaPrevia = (blobOrFile, tipo, destino = 'muro') => {
    const url = URL.createObjectURL(blobOrFile);
    setVistaPrevia({ blob: blobOrFile, url, tipo, destino });
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
    const { blob, tipo, destino } = vistaPrevia;
    try {
      const ruta = storageRef(storage, \`eventos/\${albumId}/\${Date.now()}.\${tipo === 'video' ? 'mp4' : 'jpg'}\`);
      await uploadBytes(ruta, blob);
      const urlDescarga = await getDownloadURL(ruta);
      await addDoc(collection(db, 'albums', albumId, 'fotos'), {
        url: urlDescarga, 
        tipo, 
        destino,
        comentario: tipo === 'imagen' || destino === 'muro' ? comentario.trim() : '', 
        creadoEn: new Date(), 
        subidoPor: usuario ? usuario.uid : 'anonimo'
      });
      descartarCaptura();
    } catch (error) { alert("Error al subir."); } finally { setSubiendo(false); }
  };

  // --- VISORES DE HISTORIAS Y MURO ---
  useEffect(() => {
    if (itemActivoIndex !== null) {
      itemsMuro.forEach((item, index) => {
        const videoEl = document.getElementById(\`video-muro-\${index}\`);
        if (videoEl) {
          if (index === itemActivoIndex) {
            videoEl.currentTime = 0;
            videoEl.play().catch(err => console.log(err));
          } else { videoEl.pause(); }
        }
      });
    }
  }, [itemActivoIndex, itemsMuro]);

  const marcarComoVista = (id) => {
    if (!historiasVistas.includes(id)) {
      const nuevasVistas = [...historiasVistas, id];
      setHistoriasVistas(nuevasVistas);
      localStorage.setItem('historiasVistas_' + albumId, JSON.stringify(nuevasVistas));
    }
  };
  const abrirHistoria = (index) => { setVisorHistorias({ lista: historiasOrdenadas, currentIndex: index }); setVideoProgreso(0); setSwipeOffset(0); marcarComoVista(historiasOrdenadas[index].id); };
  const avanzarHistoria = (e) => { if (e) e.stopPropagation(); if (visorHistorias.currentIndex < visorHistorias.lista.length - 1) { setVisorHistorias({ ...visorHistorias, currentIndex: visorHistorias.currentIndex + 1 }); setVideoProgreso(0); marcarComoVista(visorHistorias.lista[visorHistorias.currentIndex + 1].id); } else cerrarVisorHistorias(); };
  const retrocederHistoria = (e) => { if (e) e.stopPropagation(); if (visorHistorias.currentIndex > 0) { setVisorHistorias({ ...visorHistorias, currentIndex: visorHistorias.currentIndex - 1 }); setVideoProgreso(0); marcarComoVista(visorHistorias.lista[visorHistorias.currentIndex - 1].id); } };
  const cerrarVisorHistorias = () => { setVisorHistorias(null); setVideoProgreso(0); setSwipeOffset(0); };
  const handleTimeUpdate = (e) => { if (e.target.duration > 0) setVideoProgreso((e.target.currentTime / e.target.duration) * 100); };
  const handleTouchStart = (e) => { touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; setSwipeOffset(0); };
  const handleTouchMove = (e) => { const diffY = e.touches[0].clientY - touchStartRef.current.y; const diffX = e.touches[0].clientX - touchStartRef.current.x; if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 10) setSwipeOffset(diffY); };
  const handleTouchEnd = (e) => { const diffY = e.changedTouches[0].clientY - touchStartRef.current.y; const diffX = e.changedTouches[0].clientX - touchStartRef.current.x; if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 80) cerrarVisorHistorias(); else setSwipeOffset(0); };

  const abrirItemMuro = (index) => { setItemActivoIndex(index); setMuroSwipeOffset({ x: 0, y: 0 }); setIsSwipingMuro(false); };
  const cerrarItemMuro = () => { setItemActivoIndex(null); setMuroSwipeOffset({ x: 0, y: 0 }); };
  const avanzarItemMuro = (e) => { if(e) e.stopPropagation(); if (itemActivoIndex < itemsMuro.length - 1) setItemActivoIndex(itemActivoIndex + 1); };
  const retrocederItemMuro = (e) => { if(e) e.stopPropagation(); if (itemActivoIndex > 0) setItemActivoIndex(itemActivoIndex - 1); };

  const handleMuroTouchStart = (e) => {
    const touchY = e.touches[0].clientY;
    const screenH = window.innerHeight;
    if (itemsMuro[itemActivoIndex]?.tipo === 'video' && touchY > screenH * 0.85) {
      muroTouchStartRef.current = { ignore: true };
      return;
    }
    muroTouchStartRef.current = { x: e.touches[0].clientX, y: touchY, ignore: false };
    setIsSwipingMuro(true);
    setMuroSwipeOffset({ x: 0, y: 0 });
  };
  const handleMuroTouchMove = (e) => {
    if (!isSwipingMuro || muroTouchStartRef.current.ignore) return;
    const diffY = e.touches[0].clientY - muroTouchStartRef.current.y;
    const diffX = e.touches[0].clientX - muroTouchStartRef.current.x;
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(muroSwipeOffset.y) < 10) {
      let moveX = diffX;
      if (itemActivoIndex === 0 && diffX > 0) moveX = diffX * 0.25; 
      if (itemActivoIndex === itemsMuro.length - 1 && diffX < 0) moveX = diffX * 0.25; 
      setMuroSwipeOffset({ x: moveX, y: 0 });
    } else if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(muroSwipeOffset.x) < 10) {
      setMuroSwipeOffset({ x: 0, y: diffY });
    }
  };
  const handleMuroTouchEnd = (e) => {
    if (muroTouchStartRef.current.ignore) return;
    setIsSwipingMuro(false);
    const diffY = muroSwipeOffset.y;
    const diffX = muroSwipeOffset.x;
    if (Math.abs(diffY) > 80) cerrarItemMuro();
    else if (diffX > 70 && itemActivoIndex > 0) { retrocederItemMuro(); setMuroSwipeOffset({ x: 0, y: 0 }); } 
    else if (diffX < -70 && itemActivoIndex < itemsMuro.length - 1) { avanzarItemMuro(); setMuroSwipeOffset({ x: 0, y: 0 }); } 
    else setMuroSwipeOffset({ x: 0, y: 0 }); 
  };

  if (cargando) return <div className="min-h-screen flex items-center justify-center font-sans">Cargando...</div>;
  if (!album) return null;

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans overflow-hidden relative">
      
      {/* Inputs ocultos para compatibilidad iOS con flash garantizado */}
      <input type="file" accept="image/*" capture="environment" ref={iosPhotoInputRef} onChange={(e) => handleSeleccionArchivoNativo(e, 'imagen', 'muro')} style={{ display: 'none' }} />
      <input type="file" accept="video/*" capture="environment" ref={iosVideoInputRef} onChange={(e) => handleSeleccionArchivoNativo(e, 'video', modoCamara === 'historia' ? 'historia' : 'muro')} style={{ display: 'none' }} />

      {/* --- VISOR DE HISTORIAS --- */}
      {visorHistorias !== null && (
        <div className="fixed inset-0 z-[100] flex flex-col" style={{ backgroundColor: \`rgba(0, 0, 0, \${Math.max(0, 1 - Math.abs(swipeOffset) / 400)})\`, transform: \`translateY(\${swipeOffset}px)\`, transition: swipeOffset === 0 ? 'transform 0.25s ease-out, background-color 0.25s ease-out' : 'none', touchAction: 'none' }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          <div className="absolute top-0 w-full p-4 pt-6 flex flex-col gap-3 z-[110] bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <div className="flex gap-1 w-full shadow-sm">
              {visorHistorias.lista.map((_, i) => (<div key={i} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden"><div className="h-full bg-white transition-all duration-75 ease-linear" style={{ width: i === visorHistorias.currentIndex ? \`\${videoProgreso}%\` : i < visorHistorias.currentIndex ? '100%' : '0%' }}></div></div>))}
            </div>
            <div className="flex justify-between items-center px-1 pointer-events-auto">
              <span className="text-white text-xs font-bold tracking-widest uppercase shadow-black drop-shadow-md">Historia</span>
              <button onClick={cerrarVisorHistorias} className="text-white text-3xl font-light leading-none shadow-black drop-shadow-md pb-1">×</button>
            </div>
          </div>
          <video src={visorHistorias.lista[visorHistorias.currentIndex].url} autoPlay playsInline onEnded={avanzarHistoria} onTimeUpdate={handleTimeUpdate} className="w-full h-full object-cover" />
          <div className="absolute inset-y-0 left-0 w-[30%] z-[100]" onClick={retrocederHistoria}></div>
          <div className="absolute inset-y-0 right-0 w-[70%] z-[100]" onClick={avanzarHistoria}></div>
        </div>
      )}

      {/* --- VISOR DE MURO --- */}
      {itemActivoIndex !== null && (
        <div className="fixed inset-0 z-[100] overflow-hidden backdrop-blur-sm" style={{ backgroundColor: \`rgba(0, 0, 0, \${Math.max(0, 0.95 - Math.abs(muroSwipeOffset.y) / 400)})\`, transition: isSwipingMuro ? 'none' : 'background-color 0.3s ease-out', touchAction: 'none' }}>
          <button onClick={cerrarItemMuro} className="absolute top-6 right-6 text-white text-4xl font-light z-[120] w-12 h-12 flex items-center justify-center bg-black/40 rounded-full shadow-lg border border-white/10 backdrop-blur-md">×</button>
          {itemActivoIndex > 0 && <button onClick={retrocederItemMuro} className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl bg-black/40 rounded-full w-12 h-12 flex items-center justify-center pb-2 z-[120] hover:bg-black/60 hidden sm:flex">‹</button>}
          {itemActivoIndex < itemsMuro.length - 1 && <button onClick={avanzarItemMuro} className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl bg-black/40 rounded-full w-12 h-12 flex items-center justify-center pb-2 z-[120] hover:bg-black/60 hidden sm:flex">›</button>}

          <div className="relative w-full h-full" style={{ transform: \`translateY(\${muroSwipeOffset.y}px)\`, transition: isSwipingMuro ? 'none' : 'transform 0.3s ease-out' }} onTouchStart={handleMuroTouchStart} onTouchMove={handleMuroTouchMove} onTouchEnd={handleMuroTouchEnd}>
            {itemsMuro.map((item, index) => {
              if (Math.abs(index - itemActivoIndex) > 2) return null;
              return (
                <div key={item.id} className="absolute inset-0 w-full h-full flex items-center justify-center" style={{ transform: \`translateX(calc(\${(index - itemActivoIndex) * 100}% + \${muroSwipeOffset.x}px))\`, transition: isSwipingMuro ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.8, 0.25, 1)' }}>
                  {item.tipo === 'video' ? (
                    <video id={\`video-muro-\${index}\`} src={item.url} playsInline controls={index === itemActivoIndex} className={\`max-w-full max-h-full object-contain \${index === itemActivoIndex ? 'pointer-events-auto z-50' : 'pointer-events-none'}\`} />
                  ) : (
                    <img src={item.url} className="max-w-full max-h-full object-contain pointer-events-none" alt="Visor" />
                  )}
                  {item.comentario && (
                    <div className="absolute bottom-0 left-0 w-full p-8 pt-20 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-40">
                      <p className="text-white text-center leading-relaxed font-light text-lg drop-shadow-md">"{item.comentario}"</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- CÁMARA CON LINTERNA Y SELFIE SVG PROFESIONALES --- */}
      {camaraActiva && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {grabando && <div className="absolute top-0 left-0 w-full h-1.5 bg-white/20 z-50"><div className="h-full bg-red-600 rounded-r-md transition-all ease-linear" style={{ width: \`\${progresoGrabacion}%\` }}></div></div>}
          
          <div className="absolute top-4 w-full p-6 flex justify-between items-center z-50">
            <button onClick={detenerCamara} className="text-white text-4xl font-light">×</button>
            
            {/* BOTONES SUPERIORES DE HARDWARE (Linterna y Selfie con Íconos Profesionales SVG) */}
            <div className="flex items-center gap-3">
              {/* Botón Linterna (Flash) */}
              <button 
                onClick={toggleFlashWeb} 
                className={\`p-3 rounded-full backdrop-blur-md border transition-all duration-300 \${flashEncendido ? 'bg-amber-500/80 border-amber-300 text-white shadow-[0_0_15px_rgba(245,158,11,0.6)]' : 'bg-black/30 border-white/20 text-white hover:bg-black/50'}\`}
                title="Linterna / Flash"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={flashEncendido ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
              </button>

              {/* Botón Cámara Frontal / Selfie */}
              <button 
                onClick={cambiarCamaraSelfie} 
                className="p-3 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white hover:bg-black/50 transition"
                title="Cambiar cámara"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"></path>
                  <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M18 22l-3-3 3-3"></path>
                  <path d="M6 2l3 3-3 3"></path>
                </svg>
              </button>
            </div>
          </div>

          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover bg-gray-900" />
          
          <div className="absolute bottom-8 w-full flex flex-col items-center justify-center z-50">
            {!grabando && (
              <div className="flex gap-8 mb-6 drop-shadow-md">
                <button onClick={() => setModoCamara('historia')} className={\`text-xs font-bold tracking-widest uppercase transition-all duration-300 \${modoCamara === 'historia' ? 'text-white' : 'text-white/40'}\`}>FOTO/HISTORIA</button>
                <button onClick={() => setModoCamara('videoMuro')} className={\`text-xs font-bold tracking-widest uppercase transition-all duration-300 \${modoCamara === 'videoMuro' ? 'text-white' : 'text-white/40'}\`}>VIDEO MURO</button>
              </div>
            )}
            <p className="text-white text-[10px] opacity-75 mb-4 tracking-[0.2em] font-bold uppercase drop-shadow-md">
              {modoCamara === 'historia' ? 'Toque: Foto • Mantener: Historia' : 'Toca para grabar (Máx 20s)'}
            </p>
            <button onPointerDown={handleCamPointerDown} onPointerUp={handleCamPointerUp} onPointerLeave={handleCamPointerUp} onContextMenu={(e) => e.preventDefault()} style={{ touchAction: 'none' }} className={\`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-300 \${grabando ? 'border-red-500 scale-110' : 'border-white'}\`}>
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
            {(vistaPrevia.tipo === 'imagen' || vistaPrevia.destino === 'muro') && (
              <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-40">
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

      {/* --- CABECERA Y CARRUSEL DE HISTORIAS --- */}
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

      {/* --- MURO --- */}
      <main className="flex-1 p-6 overflow-y-auto pb-32">
        {itemsMuro.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 mt-10"><div className="text-6xl mb-4 opacity-30">📷</div><p className="text-sm font-medium">Aún no hay contenido.</p></div>
        ) : (
          <div className="grid grid-cols-2 gap-4 auto-rows-fr">
            {itemsMuro.map((item, index) => (
              <button key={item.id} onClick={() => abrirItemMuro(index)} className="flex flex-col relative rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm transition-all pb-3 text-left hover:shadow-md hover:-translate-y-0.5">
                <div className="relative aspect-square w-full overflow-hidden bg-gray-200">
                  {item.tipo === 'video' ? (
                    <>
                      <video src={item.url} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-90" />
                      <div className="absolute top-2 right-2 bg-black/20 backdrop-blur-sm p-1.5 rounded-full border border-white/20">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-white"><rect x="2" y="6" width="15" height="12" rx="2" ry="2"></rect><polygon points="17 10 22 7 22 17 17 14"></polygon></svg>
                      </div>
                    </>
                  ) : (
                    <img src={item.url} className="w-full h-full object-cover" loading="lazy" />
                  )}
                </div>
                {item.comentario && <p className="text-xs text-gray-600 px-3 mt-2 line-clamp-2 leading-relaxed italic font-sans font-light">"{item.comentario}"</p>}
              </button>
            ))}
          </div>
        )}
      </main>

      <div className="fixed bottom-10 w-full flex justify-center z-20 pointer-events-none">
        <button onClick={() => iniciarCamara('environment')} disabled={subiendo} className={\`pointer-events-auto bg-blue-600 text-white w-16 h-16 rounded-full shadow-[0_10px_25px_rgba(37,99,235,0.4)] flex items-center justify-center text-4xl pb-1 hover:bg-blue-700 transition transform \${subiendo ? 'opacity-50 scale-95' : 'hover:-translate-y-1'}\`}>{subiendo ? <span className="text-lg">⏳</span> : '+'}</button>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(__dirname, 'src/pages/[albumId]/index.js'), muroCode.trim());

console.log("✅ Implementado: Backup 'backup-antes-de-linterna', linterna inteligente, cámara frontal y SVG profesionales. Subiendo a GitHub...");
try {
  execSync('git add . && git commit -m "Agregado backup, boton linterna inteligente para Android/iOS y boton selfie con iconos SVG vectoriales" && git push origin main', { stdio: 'inherit' });
  console.log("🚀 ¡Actualización completada! Espera unos segundos a Vercel.");
} catch (err) {
  console.error("Error subiendo a GitHub:", err);
}