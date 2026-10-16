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
  const [progresoSubida, setProgresoSubida] = useState('');

  const galleryInputRef = useRef(null);
  const [loteArchivos, setLoteArchivos] = useState([]); 
  const [archivoEditandoIndex, setArchivoEditandoIndex] = useState(null);

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

  const handleGalleryFilesSelected = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const nuevosItems = files.map((file, idx) => {
      const tipo = file.type.startsWith('video/') ? 'video' : 'imagen';
      return {
        id: \`file-\${Date.now()}-\${idx}\`,
        file,
        previewUrl: URL.createObjectURL(file),
        tipo,
        destino: 'muro',
        comentario: ''
      };
    });

    setLoteArchivos(nuevosItems);
    setArchivoEditandoIndex(0);
    e.target.value = null;
  };

  const actualizarItemActual = (campo, valor) => {
    const actualizados = [...loteArchivos];
    actualizados[archivoEditandoIndex][campo] = valor;
    setLoteArchivos(actualizados);
  };

  const eliminarItemDelLote = (index) => {
    const actualizados = loteArchivos.filter((_, i) => i !== index);
    if (actualizados.length === 0) {
      setLoteArchivos([]);
      setArchivoEditandoIndex(null);
    } else {
      setLoteArchivos(actualizados);
      setArchivoEditandoIndex(Math.min(index, actualizados.length - 1));
    }
  };

  const procesarYSubirLote = async () => {
    setSubiendo(true);
    try {
      let total = loteArchivos.length;
      for (let i = 0; i < total; i++) {
        const item = loteArchivos[i];
        setProgresoSubida(total === 1 ? 'Publicando...' : \`Subiendo \${i + 1} de \${total}...\`);

        let archivoFinal = item.file;
        if (item.tipo === 'imagen') {
          archivoFinal = await comprimirImagen(item.file);
        }

        const extension = archivoFinal.name.split('.').pop() || (item.tipo === 'video' ? 'mp4' : 'jpg');
        const nombreArchivo = \`\${Date.now()}-\${Math.random().toString(36).substring(2)}.\${extension}\`;
        const ruta = storageRef(storage, \`eventos/\${albumId}/\${nombreArchivo}\`);

        await uploadBytes(ruta, archivoFinal);
        const urlDescarga = await getDownloadURL(ruta);

        await addDoc(collection(db, 'albums', albumId, 'fotos'), {
          url: urlDescarga,
          tipo: item.tipo,
          destino: item.destino,
          comentario: item.comentario.trim(),
          creadoEn: new Date(),
          subidoPor: usuario ? usuario.uid : 'anonimo'
        });
      }

      setLoteArchivos([]);
      setArchivoEditandoIndex(null);
    } catch (error) {
      console.error(error);
      alert("Hubo un error al subir los archivos.");
    } finally {
      setSubiendo(false);
      setProgresoSubida('');
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

  // --- VISORES ---
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
      
      <input 
        type="file" 
        accept="image/*,video/*" 
        multiple 
        ref={galleryInputRef} 
        onChange={handleGalleryFilesSelected} 
        style={{ display: 'none' }} 
      />

      {/* --- PANTALLA DE REVISIÓN Y CONFIGURACIÓN (Estilo Red Social / Premium) --- */}
      {loteArchivos.length > 0 && archivoEditandoIndex !== null && (
        <div className="fixed inset-0 bg-black z-[150] flex flex-col justify-between p-5 md:p-8 animate-fade-in">
          
          {/* Barra Superior */}
          <div className="flex justify-between items-center text-white pb-2 border-b border-white/10">
            <button 
              onClick={() => { setLoteArchivos([]); setArchivoEditandoIndex(null); }}
              className="text-sm font-medium text-zinc-400 hover:text-white transition"
            >
              Cancelar
            </button>
            <span className="text-xs font-semibold tracking-wider uppercase text-zinc-300">
              {loteArchivos.length === 1 ? 'Nueva publicación' : \`Archivo \${archivoEditandoIndex + 1} de \${loteArchivos.length}\`}
            </span>
            <button 
              onClick={() => eliminarItemDelLote(archivoEditandoIndex)}
              className="text-xs text-red-400 font-medium hover:text-red-300 transition"
            >
              Eliminar
            </button>
          </div>

          {/* Contenedor de Medios (Limpio, sin carteles molestos) */}
          <div className="flex-1 my-3 flex items-center justify-center relative overflow-hidden rounded-2xl bg-[#0a0a0a]">
            {loteArchivos[archivoEditandoIndex].tipo === 'video' ? (
              <video 
                src={loteArchivos[archivoEditandoIndex].previewUrl} 
                controls 
                playsInline
                className="max-h-full max-w-full object-contain" 
              />
            ) : (
              <img 
                src={loteArchivos[archivoEditandoIndex].previewUrl} 
                className="max-h-full max-w-full object-contain" 
                alt="Preview" 
              />
            )}
          </div>

          {/* Mini Carrusel inferior si seleccionó varios archivos */}
          {loteArchivos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto py-2 [&::-webkit-scrollbar]:hidden">
              {loteArchivos.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => setArchivoEditandoIndex(idx)}
                  className={\`relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 transition \${idx === archivoEditandoIndex ? 'border-blue-500 scale-105' : 'border-transparent opacity-50'}\`}
                >
                  {item.tipo === 'video' ? (
                    <video src={item.previewUrl} className="w-full h-full object-cover" />
                  ) : (
                    <img src={item.previewUrl} className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Controles de Configuración Limpios */}
          <div className="bg-[#121214] border border-white/10 rounded-3xl p-5 flex flex-col gap-4 shadow-2xl">
            
            {/* Selector de Destino Minimalista */}
            <div className="flex bg-[#222226] p-1 rounded-2xl">
              <button 
                onClick={() => actualizarItemActual('destino', 'muro')}
                className={\`flex-1 py-3 rounded-xl text-xs font-bold tracking-wide transition \${loteArchivos[archivoEditandoIndex].destino === 'muro' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white'}\`}
              >
                Muro
              </button>
              <button 
                onClick={() => actualizarItemActual('destino', 'historia')}
                className={\`flex-1 py-3 rounded-xl text-xs font-bold tracking-wide transition \${loteArchivos[archivoEditandoIndex].destino === 'historia' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white'}\`}
              >
                Historia
              </button>
            </div>

            {/* Input de Comentario Elegante */}
            <input 
              type="text" 
              placeholder="Escribe un comentario..." 
              value={loteArchivos[archivoEditandoIndex].comentario} 
              onChange={(e) => actualizarItemActual('comentario', e.target.value)}
              className="w-full bg-[#1c1c21] text-white placeholder-zinc-500 px-4 py-3.5 rounded-2xl outline-none border border-transparent focus:border-zinc-700 text-sm font-light transition"
            />

            {/* Botón de Acción Principal */}
            <div className="flex gap-3 pt-1">
              {archivoEditandoIndex < loteArchivos.length - 1 ? (
                <>
                  <button 
                    onClick={() => setArchivoEditandoIndex(archivoEditandoIndex + 1)}
                    className="flex-1 py-3.5 bg-zinc-800 text-white font-bold rounded-2xl text-sm hover:bg-zinc-700 transition"
                  >
                    Siguiente ({archivoEditandoIndex + 1}/{loteArchivos.length})
                  </button>
                  <button 
                    onClick={procesarYSubirLote}
                    disabled={subiendo}
                    className="flex-1 py-3.5 bg-blue-600 text-white font-bold rounded-2xl text-sm shadow-lg hover:bg-blue-500 transition flex items-center justify-center gap-2"
                  >
                    {subiendo ? <span>⏳ {progresoSubida}</span> : <span>Publicar todo ({loteArchivos.length})</span>}
                  </button>
                </>
              ) : (
                <button 
                  onClick={procesarYSubirLote}
                  disabled={subiendo}
                  className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl text-sm shadow-lg hover:bg-blue-500 transition flex items-center justify-center gap-2"
                >
                  {subiendo ? (
                    <><span>⏳</span> {progresoSubida}</>
                  ) : (
                    <span>{loteArchivos.length === 1 ? 'Publicar' : \`Publicar todo (\${loteArchivos.length})\`}</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* BOTÓN "+" PRINCIPAL */}
      <div className="fixed bottom-10 w-full flex justify-center z-20 pointer-events-none">
        <button 
          onClick={() => galleryInputRef.current.click()}
          disabled={subiendo} 
          className={\`pointer-events-auto bg-blue-600 text-white w-16 h-16 rounded-full shadow-[0_10px_25px_rgba(37,99,235,0.4)] flex items-center justify-center text-4xl pb-1 hover:bg-blue-700 transition transform \${subiendo ? 'opacity-50 scale-95' : 'hover:-translate-y-1'}\`}>
          {subiendo ? <span className="text-lg">⏳</span> : '+'}
        </button>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(__dirname, 'src/pages/[albumId]/index.js'), muroCode.trim());

console.log("⏳ Subiendo rediseño estético y funcional a la rama principal (main)...");
try {
  execSync('git add . && git commit -m "Rediseño total de la pantalla de revision: interfaz limpia tipo red social, botones inteligentes segun cantidad de archivos y cero textos molestos" && git push origin main', { stdio: 'inherit' });
  console.log("🚀 ¡Actualización completada! Vercel está aplicando los cambios.");
} catch (err) {
  console.error("Error al subir a Git:", err);
}