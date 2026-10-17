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

  const muroInputRef = useRef(null);
  const historiaInputRef = useRef(null);

  const [archivoEditando, setArchivoEditando] = useState(null); 
  const [mostrarCajaComentario, setMostrarCajaComentario] = useState(false);

  const videoPreviewRef = useRef(null);
  const [videoDuracion, setVideoDuracion] = useState(0);
  const [tiempoInicio, setTiempoInicio] = useState(0);

  // Estados de visores
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

  // REGLA DE ORO DE 5 DÍAS: Todo se borra estrictamente a los 5 días de la fecha del evento
  const archivosValidos = archivos.filter(a => (Date.now() - 5 * 24 * 60 * 60 * 1000) < getTime(a));
  const itemsMuro = archivosValidos.filter(a => a.tipo === 'imagen' || a.destino === 'muro');
  
  const historias = archivosValidos.filter(a => {
    if (a.tipo !== 'video' || a.destino === 'muro') return false;
    return getTime(a) > (Date.now() - 5 * 24 * 60 * 60 * 1000);
  });

  const historiasOrdenadas = [...historias].sort((a, b) => {
    const aVisto = historiasVistas.includes(a.id);
    const bVisto = historiasVistas.includes(b.id);
    if (aVisto === bVisto) return getTime(b) - getTime(a);
    return aVisto ? 1 : -1;
  });

  const handleFileSelected = (e, destino) => {
    const file = e.target.files[0];
    if (!file) return;

    const tipo = file.type.startsWith('video/') ? 'video' : 'imagen';
    setArchivoEditando({
      file,
      previewUrl: URL.createObjectURL(file),
      tipo,
      destino,
      comentario: '',
      trimStart: 0
    });
    setMostrarCajaComentario(false);
    setTiempoInicio(0);
    e.target.value = null;
  };

  const handleVideoLoadedMetadata = (e) => {
    setVideoDuracion(e.target.duration);
    setTiempoInicio(0);
  };

  const handleTimelineChange = (e) => {
    const val = parseFloat(e.target.value);
    setTiempoInicio(val);
    setArchivoEditando(prev => ({ ...prev, trimStart: val }));
    if (videoPreviewRef.current) {
      videoPreviewRef.current.currentTime = val;
    }
  };

  const publicarArchivo = async () => {
    if (!archivoEditando) return;
    setSubiendo(true);
    try {
      let archivoFinal = archivoEditando.file;
      const maxDuracion = archivoEditando.destino === 'historia' ? 10 : 20;

      if (archivoEditando.tipo === 'imagen') {
        archivoFinal = await comprimirImagen(archivoEditando.file);
      } else if (archivoEditando.tipo === 'video') {
        archivoFinal = await recortarVideoEnCliente(archivoEditando.file, archivoEditando.trimStart || 0, maxDuracion);
      }

      const extension = archivoFinal.name.split('.').pop() || (archivoEditando.tipo === 'video' ? 'mp4' : 'jpg');
      const nombreArchivo = `${Date.now()}-${Math.random().toString(36).substring(2)}.${extension}`;
      const ruta = storageRef(storage, `eventos/${albumId}/${nombreArchivo}`);

      await uploadBytes(ruta, archivoFinal);
      const urlDescarga = await getDownloadURL(ruta);

      await addDoc(collection(db, 'albums', albumId, 'fotos'), {
        url: urlDescarga,
        tipo: archivoEditando.tipo,
        destino: archivoEditando.destino,
        comentario: archivoEditando.comentario.trim(),
        creadoEn: new Date(),
        subidoPor: usuario ? usuario.uid : 'anonimo'
      });

      setArchivoEditando(null);
    } catch (error) {
      console.error(error);
      alert("Error al subir el archivo.");
    } finally {
      setSubiendo(false);
    }
  };

  const comprimirImagen = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxSize = 1600;

          if (width > height && width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          } else if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
          }, 'image/jpeg', 0.82);
        };
      };
    });
  };

  const recortarVideoEnCliente = (file, startTime, maxDuration) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        const duracionEfectiva = Math.min(video.duration, maxDuration);
        const durationToRecord = Math.min(duracionEfectiva, video.duration - startTime);
        video.currentTime = startTime;

        video.onseeked = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 720;
          canvas.height = video.videoHeight || 1280;
          const ctx = canvas.getContext('2d');

          const stream = canvas.captureStream(30);
          let recorderOptions = { mimeType: 'video/webm;codecs=vp9' };
          if (!MediaRecorder.isTypeSupported(recorderOptions.mimeType)) {
            recorderOptions = { mimeType: 'video/mp4' };
            if (!MediaRecorder.isTypeSupported(recorderOptions.mimeType)) recorderOptions = {};
          }

          let mediaRecorder;
          try {
            mediaRecorder = new MediaRecorder(stream, recorderOptions);
          } catch(e) {
            resolve(file);
            return;
          }

          const chunks = [];
          mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
          mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: recorderOptions.mimeType || 'video/mp4' });
            resolve(new File([blob], file.name, { type: blob.type, lastModified: Date.now() }));
          };

          mediaRecorder.start();
          video.play();

          const startTimeReal = Date.now();
          const interval = setInterval(() => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const elapsed = (Date.now() - startTimeReal) / 1000;
            if (elapsed >= durationToRecord || video.ended || video.currentTime >= startTime + durationToRecord) {
              clearInterval(interval);
              video.pause();
              mediaRecorder.stop();
            }
          }, 33);
        };
      };
    });
  };

  // --- VISORES ---
  useEffect(() => {
    if (itemActivoIndex !== null) {
      itemsMuro.forEach((item, index) => {
        const videoEl = document.getElementById(`video-muro-${index}`);
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

  const maxDuracionPermitida = archivoEditando?.destino === 'historia' ? 10 : 20;
  const necesitaRecorte = videoDuracion > maxDuracionPermitida;

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans overflow-hidden relative">
      
      <input type="file" accept="image/*,video/*" ref={muroInputRef} onChange={(e) => handleFileSelected(e, 'muro')} style={{ display: 'none' }} />
      <input type="file" accept="image/*,video/*" ref={historiaInputRef} onChange={(e) => handleFileSelected(e, 'historia')} style={{ display: 'none' }} />

      {/* --- PANTALLA DE EDICIÓN A PANTALLA COMPLETA (SIN CUADRO NEGRO FLOTANTE) --- */}
      {archivoEditando !== null && (
        <div className="fixed inset-0 bg-black z-[150] flex flex-col justify-between p-6 animate-fade-in">
          
          <div className="flex justify-between items-center text-white z-10">
            <button onClick={() => setArchivoEditando(null)} className="text-sm font-medium text-zinc-400 hover:text-white transition">Cancelar</button>
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">
              {archivoEditando.destino === 'muro' ? 'Nueva Publicación (Muro)' : 'Nueva Historia'}
            </span>
            <div className="w-10"></div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center bg-black">
            {archivoEditando.tipo === 'video' ? (
              <video 
                ref={videoPreviewRef}
                src={archivoEditando.previewUrl} 
                onLoadedMetadata={handleVideoLoadedMetadata}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain pointer-events-none" 
              />
            ) : (
              <img src={archivoEditando.previewUrl} className="w-full h-full object-contain" alt="Preview" />
            )}
          </div>

          <div className="relative z-10 flex flex-col gap-3 pb-6 pointer-events-none">
            
            {/* BLOQUE AZUL DESLIZABLE FIJO (Línea de tiempo con el bloque exacto que dibujaste) */}
            {archivoEditando.tipo === 'video' && necesitaRecorte && (
              <div className="w-full bg-black/80 backdrop-blur-md p-3.5 rounded-2xl flex flex-col gap-1.5 pointer-events-auto border border-blue-500/40 shadow-2xl">
                <input 
                  type="range" 
                  min="0" 
                  max={Math.max(0, videoDuracion - maxDuracionPermitida)} 
                  step="0.1"
                  value={tiempoInicio}
                  onChange={handleTimelineChange}
                  className="w-full accent-blue-500 cursor-pointer h-3 bg-zinc-800 rounded-lg appearance-none"
                />
              </div>
            )}

            {/* Caja de comentario desplegable */}
            {mostrarCajaComentario && (
              <div className="w-full bg-black/80 backdrop-blur-md p-3 rounded-2xl pointer-events-auto animate-fade-in">
                <input 
                  type="text" 
                  placeholder="Escribe un comentario..." 
                  value={archivoEditando.comentario} 
                  onChange={(e) => setArchivoEditando({ ...archivoEditando, comentario: e.target.value })}
                  className="w-full bg-white/10 text-white placeholder-zinc-400 px-4 py-3 rounded-xl outline-none border border-white/20 text-sm font-light"
                  autoFocus
                />
              </div>
            )}

            <div className="flex items-center gap-3 pointer-events-auto">
              <button 
                onClick={() => setMostrarCajaComentario(!mostrarCajaComentario)}
                className={`w-14 h-14 rounded-2xl backdrop-blur-md border flex items-center justify-center transition ${mostrarCajaComentario ? 'bg-blue-600 border-blue-400 text-white' : 'bg-black/40 border-white/20 text-white hover:bg-black/60'}`}
                title="Añadir comentario"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </button>

              <button 
                onClick={publicarArchivo}
                disabled={subiendo}
                className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl text-base shadow-[0_10px_25px_rgba(37,99,235,0.4)] hover:bg-blue-500 transition flex items-center justify-center gap-2"
              >
                {subiendo ? <span>⏳ Publicando...</span> : <span>Publicar</span>}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- VISORES --- */}
      {visorHistorias !== null && (
        <div className="fixed inset-0 z-[100] flex flex-col" style={{ backgroundColor: `rgba(0, 0, 0, ${Math.max(0, 1 - Math.abs(swipeOffset) / 400)})`, transform: `translateY(${swipeOffset}px)`, transition: swipeOffset === 0 ? 'transform 0.25s ease-out, background-color 0.25s ease-out' : 'none', touchAction: 'none' }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          <div className="absolute top-0 w-full p-4 pt-6 flex flex-col gap-3 z-[110] bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <div className="flex gap-1 w-full shadow-sm">
              {visorHistorias.lista.map((_, i) => (<div key={i} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden"><div className="h-full bg-white transition-all duration-75 ease-linear" style={{ width: i === visorHistorias.currentIndex ? `${videoProgreso}%` : i < visorHistorias.currentIndex ? '100%' : '0%' }}></div></div>))}
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

      {itemActivoIndex !== null && (
        <div className="fixed inset-0 z-[100] overflow-hidden backdrop-blur-sm" style={{ backgroundColor: `rgba(0, 0, 0, ${Math.max(0, 0.95 - Math.abs(muroSwipeOffset.y) / 400)})`, transition: isSwipingMuro ? 'none' : 'background-color 0.3s ease-out', touchAction: 'none' }}>
          <button onClick={cerrarItemMuro} className="absolute top-6 right-6 text-white text-4xl font-light z-[120] w-12 h-12 flex items-center justify-center bg-black/40 rounded-full shadow-lg border border-white/10 backdrop-blur-md">×</button>
          {itemActivoIndex > 0 && <button onClick={retrocederItemMuro} className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl bg-black/40 rounded-full w-12 h-12 flex items-center justify-center pb-2 z-[120] hover:bg-black/60 hidden sm:flex">‹</button>}
          {itemActivoIndex < itemsMuro.length - 1 && <button onClick={avanzarItemMuro} className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl bg-black/40 rounded-full w-12 h-12 flex items-center justify-center pb-2 z-[120] hover:bg-black/60 hidden sm:flex">›</button>}

          <div className="relative w-full h-full" style={{ transform: `translateY(${muroSwipeOffset.y}px)`, transition: isSwipingMuro ? 'none' : 'transform 0.3s ease-out' }} onTouchStart={handleMuroTouchStart} onTouchMove={handleMuroTouchMove} onTouchEnd={handleMuroTouchEnd}>
            {itemsMuro.map((item, index) => {
              if (Math.abs(index - itemActivoIndex) > 2) return null;
              return (
                <div key={item.id} className="absolute inset-0 w-full h-full flex items-center justify-center" style={{ transform: `translateX(calc(${(index - itemActivoIndex) * 100}% + ${muroSwipeOffset.x}px))`, transition: isSwipingMuro ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.8, 0.25, 1)' }}>
                  {item.tipo === 'video' ? (
                    <video id={`video-muro-${index}`} src={item.url} playsInline controls={index === itemActivoIndex} className={`max-w-full max-h-full object-contain ${index === itemActivoIndex ? 'pointer-events-auto z-50' : 'pointer-events-none'}`} />
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

        <div className="flex gap-3 overflow-x-auto mt-6 px-6 pb-2 [&::-webkit-scrollbar]:hidden items-center">
          <button 
            onClick={() => historiaInputRef.current.click()}
            className="flex-shrink-0 w-14 h-20 rounded-[16px] bg-blue-50 border-2 border-dashed border-blue-400 flex flex-col items-center justify-center gap-1 text-blue-600 transition transform hover:scale-95"
            title="Subir Historia"
          >
            <span className="text-2xl font-light">+</span>
            <span className="text-[8px] font-bold uppercase tracking-wider">Historia</span>
          </button>

          {historiasOrdenadas.map((historia, index) => {
            const visto = historiasVistas.includes(historia.id);
            return (
              <button key={historia.id} onClick={() => abrirHistoria(index)} className={`flex-shrink-0 relative rounded-[16px] p-[2px] transition-all transform hover:scale-95 ${visto ? 'bg-gray-300' : 'bg-blue-500'}`}>
                <div className="w-14 h-20 bg-black rounded-[14px] overflow-hidden border-[2px] border-white relative flex items-center justify-center">
                  <video src={historia.url} className={`w-full h-full object-cover transition-opacity duration-300 ${visto ? 'opacity-50' : 'opacity-80'}`} />
                  {!visto && <span className="absolute bottom-1 bg-black/60 text-white px-1.5 py-0.5 rounded text-[8px] font-bold tracking-widest">NUEVO</span>}
                </div>
              </button>
            );
          })}
        </div>
      </header>

      {/* --- MURO --- */}
      <main className="flex-1 p-6 overflow-y-auto pb-32">
        {itemsMuro.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 mt-10"><div className="text-6xl mb-4 opacity-30">📷</div><p className="text-sm font-medium">Aún no hay contenido en el muro.</p></div>
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

      {/* BOTÓN "+" PRINCIPAL DEL MURO */}
      <div className="fixed bottom-10 w-full flex justify-center z-20 pointer-events-none">
        <button 
          onClick={() => muroInputRef.current.click()}
          disabled={subiendo} 
          className={`pointer-events-auto bg-blue-600 text-white w-16 h-16 rounded-full shadow-[0_10px_25px_rgba(37,99,235,0.4)] flex items-center justify-center text-4xl pb-1 hover:bg-blue-700 transition transform ${subiendo ? 'opacity-50 scale-95' : 'hover:-translate-y-1'}`}>
          {subiendo ? <span className="text-lg">⏳</span> : '+'}
        </button>
      </div>
    </div>
  );
}