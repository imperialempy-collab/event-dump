import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../firebase/config';
import { doc, getDoc, collection, addDoc, onSnapshot, query, orderBy, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
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

  const [archivoEditando, setArchivoEditando] = useState(null); 
  const [mostrarCajaComentario, setMostrarCajaComentario] = useState(false);

  const [historiasVistas, setHistoriasVistas] = useState([]);
  const [visorHistorias, setVisorHistorias] = useState(null);
  const [videoProgreso, setVideoProgreso] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartRef = useRef({ x: 0, y: 0 });

  const [itemActivoIndex, setItemActivoIndex] = useState(null);
  const [muroSwipeOffset, setMuroSwipeOffset] = useState({ x: 0, y: 0 });
  const [isSwipingMuro, setIsSwipingMuro] = useState(false);
  const muroTouchStartRef = useRef({ x: 0, y: 0, ignore: false });

  const [panelInteractivoAbierto, setPanelInteractivoAbierto] = useState(false);
  const [pestañaActiva, setPestañaActiva] = useState('comentarios'); 
  const [nuevoComentarioTexto, setNuevoComentarioTexto] = useState('');
  const [listaComentarios, setListaComentarios] = useState([]);

  const [columnasMuro, setColumnasMuro] = useState(2);
  const pinchStartDistRef = useRef(null);

  const usuarioId = usuario ? usuario.uid : 'anonimo_' + (typeof window !== 'undefined' ? (localStorage.getItem('anon_id') || (() => {
    const id = Math.random().toString(36).substring(2);
    localStorage.setItem('anon_id', id);
    return id;
  })()) : 'guest');

  const usuarioNombre = usuario ? (usuario.displayName || usuario.email || 'Usuario') : 'Invitado';
  
  const esAnonimo = !usuario;
  const alertaAnonimo = (e) => {
    if(e) e.stopPropagation();
    alert('Debes iniciar sesión para interactuar');
  };

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
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        likesArray: doc.data().likesArray || [],
        likesData: doc.data().likesData || [],
        comentarios: doc.data().comentarios || [],
        ...doc.data() 
      }));
      setArchivos(data);
    });
    return () => unsubscribe();
  }, [albumId]);

  useEffect(() => {
    if (itemActivoIndex !== null && itemsMuro[itemActivoIndex]) {
      setListaComentarios(itemsMuro[itemActivoIndex].comentarios || []);
    }
  }, [itemActivoIndex, archivos]);

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash !== '#viewer') {
        setItemActivoIndex(null);
        setVisorHistorias(null);
        setArchivoEditando(null);
        setPanelInteractivoAbierto(false);
        setMenuAbierto(false);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const openModal = () => {
    if (window.location.hash !== '#viewer') window.location.hash = 'viewer';
  };

  const closeModal = () => {
    if (window.location.hash === '#viewer') window.history.back();
  };

  const getTime = (item) => item.creadoEn?.toMillis ? item.creadoEn.toMillis() : (item.creadoEn ? new Date(item.creadoEn).getTime() : 0);

  // Todo va al muro ahora
  const itemsMuro = archivos;
  
// RANKING: Todas las publicaciones con Me gusta
  const topRanking = [...itemsMuro]
    .filter(a => (a.likesArray || []).length > 0) // Debe tener al menos 1 like para entrar al ranking
    .sort((a, b) => {
      const likesA = (a.likesArray || []).length;
      const likesB = (b.likesArray || []).length;
      if (likesB !== likesA) return likesB - likesA; // Ordenar por likes
      return getTime(b) - getTime(a); // Desempate: el más reciente primero
    });

  const handlePinchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handlePinchMove = (e) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const diff = currentDist - pinchStartDistRef.current;
      
      if (diff < -50) {
        setColumnasMuro(prev => Math.min(4, prev + 1));
        pinchStartDistRef.current = currentDist;
      } else if (diff > 50) {
        setColumnasMuro(prev => Math.max(2, prev - 1));
        pinchStartDistRef.current = currentDist;
      }
    }
  };

  const handlePinchEnd = (e) => {
    if (e.touches.length < 2) {
      pinchStartDistRef.current = null;
    }
  };

  const ciclarColumnas = () => {
    setColumnasMuro(prev => {
      if (prev === 2) return 3;
      if (prev === 3) return 4;
      return 2;
    });
  };

  const handleFileSelected = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    openModal();
    const tipo = file.type.startsWith('video/') ? 'video' : 'imagen';
    setArchivoEditando({
      file,
      previewUrl: URL.createObjectURL(file),
      tipo,
      comentario: ''
    });
    setMostrarCajaComentario(false);
    e.target.value = null;
  };

  const cancelarEdicion = () => {
    setArchivoEditando(null);
    closeModal();
  };

  const publicarArchivo = async () => {
    if (!archivoEditando) return;
    setSubiendo(true);
    try {
      let archivoFinal = archivoEditando.file;

      if (archivoEditando.tipo === 'imagen') {
        archivoFinal = await comprimirImagen(archivoEditando.file);
      }

      const extension = archivoFinal.name.split('.').pop() || (archivoEditando.tipo === 'video' ? 'mp4' : 'jpg');
      const nombreArchivo = `${Date.now()}-${Math.random().toString(36).substring(2)}.${extension}`;
      const ruta = storageRef(storage, `eventos/${albumId}/${nombreArchivo}`);

      await uploadBytes(ruta, archivoFinal);
      const urlDescarga = await getDownloadURL(ruta);

      const comentariosIniciales = archivoEditando.comentario.trim() ? [{
        id: Date.now().toString(),
        texto: archivoEditando.comentario.trim(),
        autorId: usuarioId,
        autorNombre: usuarioNombre,
        creadoEn: new Date().toISOString()
      }] : [];

      await addDoc(collection(db, 'albums', albumId, 'fotos'), {
        url: urlDescarga,
        tipo: archivoEditando.tipo,
        destino: 'muro', // Todo va al muro
        likesArray: [],
        likesData: [],
        comentarios: comentariosIniciales,
        creadoEn: new Date(),
        subidoPor: usuarioId,
        subidoPorNombre: usuarioNombre
      });

      setArchivoEditando(null);
      closeModal();
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

  const handleLike = async (e, item) => {
    e.stopPropagation();
    if (!item) return;
    try {
      const docRef = doc(db, 'albums', albumId, 'fotos', item.id);
      const yaDioLike = (item.likesArray || []).includes(usuarioId);

      if (yaDioLike) {
        const likeObj = (item.likesData || []).find(l => l.id === usuarioId);
        if (likeObj) {
          await updateDoc(docRef, { 
            likesArray: arrayRemove(usuarioId),
            likesData: arrayRemove(likeObj)
          });
        } else {
          await updateDoc(docRef, { likesArray: arrayRemove(usuarioId) });
        }
      } else {
        const nuevoLikeObj = { id: usuarioId, nombre: usuarioNombre };
        await updateDoc(docRef, { 
          likesArray: arrayUnion(usuarioId),
          likesData: arrayUnion(nuevoLikeObj)
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const enviarComentarioDirecto = async (texto, item) => {
    if (!texto.trim() || !item) return;
    try {
      const docRef = doc(db, 'albums', albumId, 'fotos', item.id);
      const nuevoComentario = {
        id: Date.now().toString(),
        texto: texto.trim(),
        autorId: usuarioId,
        autorNombre: usuarioNombre,
        creadoEn: new Date().toISOString()
      };
      await updateDoc(docRef, { comentarios: arrayUnion(nuevoComentario) });
    } catch (err) { console.error(err); }
  };

  const enviarComentario = async (e) => {
    e.preventDefault();
    if (!nuevoComentarioTexto.trim()) return;

    // Detectamos si el usuario está viendo el Muro o las Historias para enviar al elemento correcto
    let itemActual = null;
    if (visorHistorias !== null) {
      itemActual = visorHistorias.lista[visorHistorias.currentIndex];
    } else if (itemActivoIndex !== null) {
      itemActual = itemsMuro[itemActivoIndex];
    }

    if (!itemActual) return;

    await enviarComentarioDirecto(nuevoComentarioTexto, itemActual);
    setNuevoComentarioTexto('');
  };

  useEffect(() => {
    if (itemActivoIndex !== null) {
      const todosLosVideos = document.querySelectorAll('video[id^="video-muro-"]');
      todosLosVideos.forEach(v => {
        if (v.id === `video-muro-${itemActivoIndex}`) {
          if (v.currentTime === 0 || v.paused) {
            v.currentTime = 0;
            v.play().catch(err => console.log(err));
          }
        } else {
          v.pause();
        }
      });
    }
  }, [itemActivoIndex]);

  // Pausar video de historia si se abre el panel de comentarios
  useEffect(() => {
    if (visorHistorias !== null) {
      const video = document.getElementById('video-historia');
      if (video) {
        if (panelInteractivoAbierto) {
          video.pause();
        } else {
          video.play().catch(err => console.log(err));
        }
      }
    }
  }, [panelInteractivoAbierto, visorHistorias?.currentIndex]);

  const marcarComoVista = (id) => {
    if (!historiasVistas.includes(id)) {
      const nuevasVistas = [...historiasVistas, id];
      setHistoriasVistas(nuevasVistas);
      localStorage.setItem('historiasVistas_' + albumId, JSON.stringify(nuevasVistas));
    }
  };

  const abrirHistoria = (index) => { 
    openModal();
    setVisorHistorias({ lista: topRanking, currentIndex: index }); 
    setVideoProgreso(0); 
    setSwipeOffset(0); 
    setPanelInteractivoAbierto(false);
    marcarComoVista(topRanking[index].id); 
  };
  
  const manejarTiempoHistoria = (e) => {
      // Solo avanza si el panel de comentarios NO está abierto
      if (e.target.currentTime >= 10 && !panelInteractivoAbierto) avanzarHistoria();
  };

  const avanzarHistoria = (e) => { 
    if (e) e.stopPropagation(); 
    
    // Si el panel de comentarios está abierto, un clic lateral solo lo cierra
    if (panelInteractivoAbierto) {
      setPanelInteractivoAbierto(false);
      return;
    }

    setVisorHistorias(prev => {
      if (!prev) return null;
      if (prev.currentIndex < prev.lista.length - 1) {
        marcarComoVista(prev.lista[prev.currentIndex + 1].id);
        setVideoProgreso(0);
        return { ...prev, currentIndex: prev.currentIndex + 1 };
      } else {
        cerrarVisorHistorias();
        return null;
      }
    });
  };

  const retrocederHistoria = (e) => { 
    if (e) e.stopPropagation(); 
    
    // Si el panel de comentarios está abierto, un clic lateral solo lo cierra
    if (panelInteractivoAbierto) {
      setPanelInteractivoAbierto(false);
      return;
    }

    if (visorHistorias.currentIndex > 0) { 
        setVisorHistorias({ ...visorHistorias, currentIndex: visorHistorias.currentIndex - 1 }); 
        setVideoProgreso(0); 
        marcarComoVista(visorHistorias.lista[visorHistorias.currentIndex - 1].id); 
    } 
  };
  
  const cerrarVisorHistorias = () => { 
    setVisorHistorias(null); 
    setVideoProgreso(0); 
    setSwipeOffset(0); 
    setPanelInteractivoAbierto(false);
    closeModal();
  };

  const handleTimeUpdate = (e) => { 
      if (e.target.duration > 0) setVideoProgreso((e.target.currentTime / Math.min(e.target.duration, 10)) * 100); 
      manejarTiempoHistoria(e);
  };

  // Efecto para animar el progreso si es imagen en el visor de historias
  useEffect(() => {
    let interval;
    // Solo avanza la barra de la foto si el panel NO está abierto
    if (visorHistorias && !panelInteractivoAbierto) {
        const itemActivo = visorHistorias.lista[visorHistorias.currentIndex];
        if (itemActivo && itemActivo.tipo !== 'video') {
            interval = setInterval(() => {
                setVideoProgreso(prev => {
                    if (prev >= 100) return 100;
                    return prev + 2; // Llena la barra en 5 segundos (2% cada 100ms)
                });
            }, 100);
        }
    }
    return () => clearInterval(interval);
  }, [visorHistorias?.currentIndex, panelInteractivoAbierto]);

  // Avanzar automáticamente cuando la barra llega a 100 en imágenes
  useEffect(() => {
    if (visorHistorias && videoProgreso >= 100 && !panelInteractivoAbierto) {
        const itemActivo = visorHistorias.lista[visorHistorias.currentIndex];
        if (itemActivo && itemActivo.tipo !== 'video') {
            avanzarHistoria();
        }
    }
  }, [videoProgreso]);

  const handleTouchStart = (e) => { touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; setSwipeOffset(0); };
  const handleTouchMove = (e) => { const diffY = e.touches[0].clientY - touchStartRef.current.y; const diffX = e.touches[0].clientX - touchStartRef.current.x; if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 10) setSwipeOffset(diffY); };
  const handleTouchEnd = (e) => { const diffY = e.changedTouches[0].clientY - touchStartRef.current.y; const diffX = e.changedTouches[0].clientX - touchStartRef.current.x; if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 80) cerrarVisorHistorias(); else setSwipeOffset(0); };

  const abrirItemMuro = (index) => { 
    openModal();
    setItemActivoIndex(index); 
    setMuroSwipeOffset({ x: 0, y: 0 }); 
    setIsSwipingMuro(false); 
    setPanelInteractivoAbierto(false);
  };
  
  const cerrarItemMuro = () => { 
    setItemActivoIndex(null); 
    setMuroSwipeOffset({ x: 0, y: 0 }); 
    setPanelInteractivoAbierto(false);
    closeModal();
  };

  const avanzarItemMuro = (e) => { if(e) e.stopPropagation(); if (itemActivoIndex < itemsMuro.length - 1) { setItemActivoIndex(itemActivoIndex + 1); setPanelInteractivoAbierto(false); } };
  const retrocederItemMuro = (e) => { if(e) e.stopPropagation(); if (itemActivoIndex > 0) { setItemActivoIndex(itemActivoIndex - 1); setPanelInteractivoAbierto(false); } };

  const handleMuroTouchStart = (e) => {
    const touchY = e.touches[0].clientY;
    const screenH = window.innerHeight;
    if (itemsMuro[itemActivoIndex]?.tipo === 'video' && touchY > screenH * 0.85) {
      muroTouchStartRef.current = { ignore: true };
      return;
    }
    if (panelInteractivoAbierto) {
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

  const manejarTiempoMuro = (e) => {
      if (e.target.currentTime >= 20) {
          e.target.currentTime = 0;
          e.target.play();
      }
  };

  const compartirAlbum = () => {
    const urlActual = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: album?.nombreEvento || 'Álbum del Evento',
        text: '¡Únete a nuestro álbum para ver y subir fotos y videos!',
        url: urlActual,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(urlActual);
      alert('¡Enlace del álbum copiado al portapapeles!');
    }
    setMenuAbierto(false);
  };

  const copiarLinkPantalla = () => {
    const urlPantalla = `${window.location.origin}/${albumId}/pantalla`;
    navigator.clipboard.writeText(urlPantalla);
    alert('¡Link de la Pantalla Gigante copiado!\nYa puedes enviarlo por WhatsApp al operador.');
    setMenuAbierto(false);
  };

  if (cargando) return <div className="min-h-screen flex items-center justify-center font-sans">Cargando...</div>;
  if (!album) return null;

  const gridColsClass = columnasMuro === 2 ? 'grid-cols-2' : columnasMuro === 3 ? 'grid-cols-3' : 'grid-cols-4';
  const gridGapClass = columnasMuro === 2 ? 'gap-4' : columnasMuro === 3 ? 'gap-2' : 'gap-1';
  const mainPadding = columnasMuro === 2 ? 'p-6' : columnasMuro === 3 ? 'p-4' : 'p-2';

  const itemActivo = itemActivoIndex !== null ? itemsMuro[itemActivoIndex] : null;
  const usuarioDioLikeActivo = itemActivo ? (itemActivo.likesArray || []).includes(usuarioId) : false;
  
  const historiaActiva = visorHistorias ? visorHistorias.lista[visorHistorias.currentIndex] : null;
  const usuarioDioLikeHistoria = historiaActiva ? (historiaActiva.likesArray || []).includes(usuarioId) : false;

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans overflow-hidden relative">
      
      {/* Input de archivos general */}
      <input type="file" accept="image/*,video/*" ref={muroInputRef} onChange={handleFileSelected} style={{ display: 'none' }} />

      {archivoEditando !== null && (
        <div className="fixed inset-0 bg-black z-[150] flex flex-col justify-between p-6 transition-opacity">
          <div className="flex justify-between items-center text-white z-10">
            <button onClick={cancelarEdicion} className="text-sm font-medium text-zinc-400 hover:text-white transition">Cancelar</button>
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">Nueva Publicación</span>
            <div className="w-10"></div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center bg-black">
            {archivoEditando.tipo === 'video' ? (
              <video src={archivoEditando.previewUrl} autoPlay loop muted playsInline className="w-full h-full object-contain pointer-events-none" />
            ) : (
              <img src={archivoEditando.previewUrl} className="w-full h-full object-contain" alt="Preview" />
            )}
          </div>

          <div className="relative z-10 flex flex-col gap-3 pb-6 pointer-events-none">
            {mostrarCajaComentario && (
              <div className="w-full bg-black/80 backdrop-blur-md p-3 rounded-2xl pointer-events-auto">
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
              <button onClick={() => setMostrarCajaComentario(!mostrarCajaComentario)} className={`w-14 h-14 rounded-2xl backdrop-blur-md border flex items-center justify-center transition ${mostrarCajaComentario ? 'bg-blue-600 border-blue-400 text-white' : 'bg-black/40 border-white/20 text-white hover:bg-black/60'}`} title="Añadir comentario">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </button>
              <button onClick={publicarArchivo} disabled={subiendo} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl text-base shadow-[0_10px_25px_rgba(37,99,235,0.4)] hover:bg-blue-500 transition flex items-center justify-center gap-2">
                {subiendo ? <span>⏳ Subiendo...</span> : <span>Publicar</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISOR DE HISTORIAS / TOP RANKING */}
      {visorHistorias !== null && (
        <div className="fixed inset-0 z-[100] flex flex-col" style={{ backgroundColor: `rgba(0, 0, 0, ${Math.max(0, 1 - Math.abs(swipeOffset) / 400)})`, transform: `translateY(${swipeOffset}px)`, transition: swipeOffset === 0 ? 'transform 0.25s ease-out, background-color 0.25s ease-out' : 'none', touchAction: 'none' }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          <div className="absolute top-0 w-full p-4 pt-6 flex flex-col gap-3 z-[110] bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <div className="flex gap-1 w-full shadow-sm">
              {visorHistorias.lista.map((_, i) => (<div key={i} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden"><div className="h-full bg-white transition-all duration-75 ease-linear" style={{ width: i === visorHistorias.currentIndex ? `${videoProgreso}%` : i < visorHistorias.currentIndex ? '100%' : '0%' }}></div></div>))}
            </div>
            <div className="flex justify-between items-center px-1 pointer-events-auto">
              <span className="text-white text-xs font-bold tracking-widest uppercase shadow-black drop-shadow-md">TOP RANKING #{visorHistorias.currentIndex + 1}</span>
              <button onClick={cerrarVisorHistorias} className="text-white text-3xl font-light leading-none shadow-black drop-shadow-md pb-1">×</button>
            </div>
          </div>
          
          {historiaActiva?.tipo === 'video' ? (
             <video id="video-historia" src={historiaActiva.url} autoPlay playsInline onTimeUpdate={handleTimeUpdate} className="w-full h-full object-cover" />
          ) : (
             <img src={historiaActiva?.url} alt="Top Rank" className="w-full h-full object-cover" />
          )}
          
          <div className="absolute inset-y-0 left-0 w-[30%] z-[100]" onClick={retrocederHistoria}></div>
          <div className="absolute inset-y-0 right-0 w-[70%] z-[100]" onClick={avanzarHistoria}></div>

          {/* Panel y Botones para HISTORIAS idéntico al Muro */}
          <div className="absolute bottom-0 inset-x-0 p-6 pb-8 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-4 z-[120] pointer-events-none">
            
            <div className="flex items-center justify-end gap-6 text-white pointer-events-auto">
              <button onClick={() => { setPanelInteractivoAbierto(true); setPestañaActiva('comentarios'); }} className="flex items-center gap-2 text-sm font-semibold transition active:scale-110">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                {(historiaActiva?.comentarios || []).length > 0 && <span>{(historiaActiva?.comentarios || []).length}</span>}
              </button>

              <button 
                onClick={(e) => esAnonimo ? alertaAnonimo(e) : handleLike(e, historiaActiva)}
                className="flex items-center gap-2 text-sm font-semibold transition active:scale-125"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={usuarioDioLikeHistoria ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-6 h-6 ${usuarioDioLikeHistoria ? 'text-red-500' : 'text-white'}`}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                {(historiaActiva?.likesArray || []).length > 0 && <span>{(historiaActiva?.likesArray || []).length}</span>}
              </button>
            </div>

            {panelInteractivoAbierto && (
              <div 
                className="bg-zinc-900/95 backdrop-blur-md rounded-2xl p-4 max-h-72 flex flex-col gap-3 border border-white/10 shadow-2xl pointer-events-auto"
                onClick={(e) => e.stopPropagation()} 
              >
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setPestañaActiva('comentarios')}
                      className={`text-xs font-bold uppercase tracking-wider transition pb-1 ${pestañaActiva === 'comentarios' ? 'text-zinc-100 border-b-2 border-blue-500' : 'text-zinc-500'}`}
                    >
                      Comentarios
                    </button>
                    <button 
                      onClick={() => setPestañaActiva('likes')}
                      className={`text-xs font-bold uppercase tracking-wider transition pb-1 ${pestañaActiva === 'likes' ? 'text-zinc-100 border-b-2 border-red-500' : 'text-zinc-500'}`}
                    >
                      Me gusta
                    </button>
                  </div>
                  <button onClick={() => setPanelInteractivoAbierto(false)} className="text-zinc-400 text-2xl leading-none pb-1">×</button>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                  {pestañaActiva === 'comentarios' ? (
                    (historiaActiva?.comentarios || []).length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-4">Aún no hay comentarios. ¡Sé el primero en comentar!</p>
                    ) : (
                      (historiaActiva?.comentarios || []).map(c => (
                        <div key={c.id} className="bg-white/5 p-2.5 rounded-xl flex flex-col gap-1">
                          <span className="text-[11px] font-bold text-blue-400">{c.autorNombre}</span>
                          <p className="text-xs text-zinc-200 leading-relaxed">{c.texto}</p>
                        </div>
                      ))
                    )
                  ) : (
                    (historiaActiva?.likesData || []).length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-4">Aún no hay Me gusta.</p>
                    ) : (
                      (historiaActiva?.likesData || []).map((like, i) => (
                        <div key={i} className="flex items-center gap-3 bg-white/5 p-2.5 rounded-xl">
                          <div className="w-7 h-7 bg-red-500/20 rounded-full flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                          </div>
                          <span className="text-xs font-bold text-zinc-200">{like.nombre || 'Usuario'}</span>
                        </div>
                      ))
                    )
                  )}
                </div>

                {pestañaActiva === 'comentarios' && (
                  <div className="pt-1 border-t border-white/10 mt-1">
                    {esAnonimo ? (
                      <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center cursor-pointer" onClick={alertaAnonimo}>
                        <p className="text-xs font-medium text-zinc-400">Inicia sesión para comentar</p>
                      </div>
                    ) : (
                      <form onSubmit={enviarComentario} className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Escribe un comentario..." 
                          value={nuevoComentarioTexto}
                          onChange={(e) => setNuevoComentarioTexto(e.target.value)}
                          className="flex-1 bg-white/10 text-white placeholder-zinc-400 px-3 py-2.5 rounded-xl outline-none text-xs border border-white/10"
                        />
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md hover:bg-blue-500 transition">Enviar</button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISOR DEL MURO */}
      {itemActivoIndex !== null && (
        <div 
          className="fixed inset-0 z-[100] overflow-hidden backdrop-blur-sm" 
          style={{ 
            backgroundColor: `rgba(0, 0, 0, ${Math.max(0, 0.95 - Math.abs(muroSwipeOffset.y) / 400)})`, 
            transition: isSwipingMuro ? 'none' : 'background-color 0.3s ease-out', 
            touchAction: 'none' 
          }}
        >
          <div className="absolute top-0 inset-x-0 p-4 pt-6 flex justify-between items-center z-[130] bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <span className="text-white/80 text-xs font-medium tracking-wide">Publicado por {itemActivo?.subidoPorNombre || 'Invitado'}</span>
            <button onClick={cerrarItemMuro} className="text-white text-4xl font-light w-12 h-12 flex items-center justify-center pointer-events-auto bg-black/20 rounded-full backdrop-blur-md">×</button>
          </div>
          
          {itemActivoIndex > 0 && <button onClick={retrocederItemMuro} className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl bg-black/40 rounded-full w-12 h-12 flex items-center justify-center pb-2 z-[120] hover:bg-black/60 hidden sm:flex">‹</button>}
          {itemActivoIndex < itemsMuro.length - 1 && <button onClick={avanzarItemMuro} className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl bg-black/40 rounded-full w-12 h-12 flex items-center justify-center pb-2 z-[120] hover:bg-black/60 hidden sm:flex">›</button>}

          <div 
            className="relative w-full h-full" 
            style={{ transform: `translateY(${muroSwipeOffset.y}px)`, transition: isSwipingMuro ? 'none' : 'transform 0.3s ease-out' }} 
            onTouchStart={handleMuroTouchStart} 
            onTouchMove={handleMuroTouchMove} 
            onTouchEnd={handleMuroTouchEnd}
          >
            {itemsMuro.map((item, index) => {
              if (Math.abs(index - itemActivoIndex) > 2) return null;
              return (
                <div 
                  key={item.id} 
                  className="absolute inset-0 w-full h-full flex items-center justify-center" 
                  style={{ transform: `translateX(calc(${((index - itemActivoIndex) * 100)}% + ${muroSwipeOffset.x}px))`, transition: isSwipingMuro ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.8, 0.25, 1)' }}
                  onClick={() => { if(panelInteractivoAbierto) setPanelInteractivoAbierto(false); }}
                >
                  {item.tipo === 'video' ? (
                    <video id={`video-muro-${index}`} src={item.url} playsInline controls={index === itemActivoIndex} onTimeUpdate={manejarTiempoMuro} className={`max-w-full max-h-full object-contain ${index === itemActivoIndex ? 'pointer-events-auto z-50' : 'pointer-events-none'}`} />
                  ) : (
                    <img src={item.url} className="max-w-full max-h-full object-contain pointer-events-none" alt="Visor" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Panel y Botones para MURO */}
          <div className="absolute bottom-0 inset-x-0 p-6 pb-8 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-4 z-[130] pointer-events-none">
            
            <div className="flex items-center justify-end gap-6 text-white pointer-events-auto">
              
              <button onClick={() => { setPanelInteractivoAbierto(true); setPestañaActiva('comentarios'); }} className="flex items-center gap-2 text-sm font-semibold transition active:scale-110">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                {(itemActivo?.comentarios || []).length > 0 && <span>{(itemActivo?.comentarios || []).length}</span>}
              </button>

              <button 
                onClick={(e) => esAnonimo ? alertaAnonimo(e) : handleLike(e, itemActivo)}
                className="flex items-center gap-2 text-sm font-semibold transition active:scale-125"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={usuarioDioLikeActivo ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-6 h-6 ${usuarioDioLikeActivo ? 'text-red-500' : 'text-white'}`}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                {(itemActivo?.likesArray || []).length > 0 && <span>{(itemActivo?.likesArray || []).length}</span>}
              </button>

            </div>

            {panelInteractivoAbierto && (
              <div 
                className="bg-zinc-900/95 backdrop-blur-md rounded-2xl p-4 max-h-72 flex flex-col gap-3 border border-white/10 shadow-2xl pointer-events-auto"
                onClick={(e) => e.stopPropagation()} 
              >
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setPestañaActiva('comentarios')}
                      className={`text-xs font-bold uppercase tracking-wider transition pb-1 ${pestañaActiva === 'comentarios' ? 'text-zinc-100 border-b-2 border-blue-500' : 'text-zinc-500'}`}
                    >
                      Comentarios
                    </button>
                    <button 
                      onClick={() => setPestañaActiva('likes')}
                      className={`text-xs font-bold uppercase tracking-wider transition pb-1 ${pestañaActiva === 'likes' ? 'text-zinc-100 border-b-2 border-red-500' : 'text-zinc-500'}`}
                    >
                      Me gusta
                    </button>
                  </div>
                  <button onClick={() => setPanelInteractivoAbierto(false)} className="text-zinc-400 text-2xl leading-none pb-1">×</button>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                  {pestañaActiva === 'comentarios' ? (
                    (itemActivo?.comentarios || []).length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-4">Aún no hay comentarios. ¡Sé el primero en comentar!</p>
                    ) : (
                      (itemActivo?.comentarios || []).map(c => (
                        <div key={c.id} className="bg-white/5 p-2.5 rounded-xl flex flex-col gap-1">
                          <span className="text-[11px] font-bold text-blue-400">{c.autorNombre}</span>
                          <p className="text-xs text-zinc-200 leading-relaxed">{c.texto}</p>
                        </div>
                      ))
                    )
                  ) : (
                    (itemActivo?.likesData || []).length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-4">Aún no hay Me gusta.</p>
                    ) : (
                      (itemActivo?.likesData || []).map((like, i) => (
                        <div key={i} className="flex items-center gap-3 bg-white/5 p-2.5 rounded-xl">
                          <div className="w-7 h-7 bg-red-500/20 rounded-full flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                          </div>
                          <span className="text-xs font-bold text-zinc-200">{like.nombre || 'Usuario'}</span>
                        </div>
                      ))
                    )
                  )}
                </div>

                {pestañaActiva === 'comentarios' && (
                  <div className="pt-1 border-t border-white/10 mt-1">
                    {esAnonimo ? (
                      <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center cursor-pointer" onClick={alertaAnonimo}>
                        <p className="text-xs font-medium text-zinc-400">Inicia sesión para comentar</p>
                      </div>
                    ) : (
                      <form onSubmit={enviarComentario} className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Escribe un comentario..." 
                          value={nuevoComentarioTexto}
                          onChange={(e) => setNuevoComentarioTexto(e.target.value)}
                          className="flex-1 bg-white/10 text-white placeholder-zinc-400 px-3 py-2.5 rounded-xl outline-none text-xs border border-white/10"
                        />
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md hover:bg-blue-500 transition">Enviar</button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <header className="bg-white pt-4 pb-5 shadow-sm sticky top-0 z-10 rounded-b-[2rem] flex flex-col">
        <div className="flex items-center justify-between px-6">
          <button onClick={() => router.push('/')} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-600">←</button>
          <div className="flex flex-col items-center flex-1 px-2 overflow-hidden">
            <h1 className="text-xl font-serif text-black truncate w-full text-center">{album.nombreEvento}</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1 font-medium">{album.fechaEvento}</p>
          </div>
          <button onClick={() => setMenuAbierto(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-600 pb-2 text-2xl">⋮</button>
        </div>

        {/* Carrusel de TOP 10 Ranking */}
        {topRanking.length > 0 && (
          <div className="flex gap-3 overflow-x-auto mt-6 px-6 pb-2 [&::-webkit-scrollbar]:hidden items-center">
            {topRanking.map((item, index) => {
              const visto = historiasVistas.includes(item.id);
              return (
                <button key={item.id} onClick={() => abrirHistoria(index)} className={`flex-shrink-0 relative rounded-[16px] p-[2px] transition-all transform hover:scale-95 ${visto ? 'bg-gray-200' : 'bg-gradient-to-tr from-blue-500 to-purple-500'}`}>
                  <div className="w-14 h-20 bg-black rounded-[14px] overflow-hidden border-[2px] border-white relative flex items-center justify-center">
                    {item.tipo === 'video' ? (
                      <video src={item.url} className={`w-full h-full object-cover transition-opacity duration-300 ${visto ? 'opacity-50' : 'opacity-90'}`} />
                    ) : (
                      <img src={item.url} className={`w-full h-full object-cover transition-opacity duration-300 ${visto ? 'opacity-50' : 'opacity-90'}`} />
                    )}
                    
                    <span className="absolute top-1 left-1 bg-black/70 text-white px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-widest shadow-md">
                      #{index + 1}
                    </span>
                    
                    <div className="absolute bottom-1 right-1 flex items-center gap-0.5 text-[9px] font-bold text-white bg-black/60 px-1 rounded-full">
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 text-red-500"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                       {(item.likesArray || []).length}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </header>

      <main 
        className={`flex-1 overflow-y-auto pb-32 transition-all duration-300 ${mainPadding}`}
        onTouchStart={handlePinchStart}
        onTouchMove={handlePinchMove}
        onTouchEnd={handlePinchEnd}
      >
        {itemsMuro.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 mt-10"><div className="text-6xl mb-4 opacity-30">📷</div><p className="text-sm font-medium">Aún no hay contenido en el muro.</p></div>
        ) : (
          <div className={`grid ${gridColsClass} ${gridGapClass} auto-rows-fr transition-all duration-300`}>
            {itemsMuro.map((item, index) => {
              const totalLikes = (item.likesArray || []).length;
              const totalComentarios = (item.comentarios || []).length;
              const esDueno = item.subidoPor === usuarioId;
              const corazonRojo = esDueno && totalLikes > 0;

              return (
                <div key={item.id} onClick={() => abrirItemMuro(index)} className="relative aspect-square w-full rounded-2xl overflow-hidden bg-zinc-900 shadow-sm transition-all hover:scale-[0.98] cursor-pointer">
                  
                  {item.tipo === 'video' ? (
                    <video src={item.url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  ) : (
                    <img src={item.url} className="w-full h-full object-cover" loading="lazy" />
                  )}

                  {item.tipo === 'video' && (
                    <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md p-1.5 rounded-full border border-white/20">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-white"><rect x="2" y="6" width="15" height="12" rx="2" ry="2"></rect><polygon points="17 10 22 7 22 17 17 14"></polygon></svg>
                    </div>
                  )}

                  <div className="absolute bottom-2 right-2.5 flex items-center gap-3 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    
                    {totalComentarios > 0 && (
                      <div className="flex items-center gap-1 text-xs font-semibold">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        <span>{totalComentarios}</span>
                      </div>
                    )}

                    <button 
                      onClick={(e) => esAnonimo ? alertaAnonimo(e) : handleLike(e, item)}
                      className="flex items-center gap-1 text-xs font-semibold transition active:scale-125"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={corazonRojo ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${corazonRojo ? 'text-red-500' : 'text-white'}`}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                      {totalLikes > 0 && <span>{totalLikes}</span>}
                    </button>

                  </div>

                </div>
              );
            })}
          </div>
        )}
      </main>

      {menuAbierto && (
        <div className="fixed inset-0 z-[200] flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setMenuAbierto(false)}>
          <div className="w-64 bg-white h-full shadow-2xl flex flex-col p-6 transition-transform" onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-serif text-black">Menú</h2>
              <button onClick={() => setMenuAbierto(false)} className="text-3xl font-light text-gray-400 leading-none pb-1">×</button>
            </div>
            
            <div className="flex flex-col gap-3">
              <button onClick={compartirAlbum} className="flex items-center gap-3 text-sm font-bold text-gray-700 hover:text-blue-600 transition p-4 bg-gray-50 rounded-xl border border-gray-100 shadow-sm w-full text-left">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                Compartir Álbum
              </button>
              <button onClick={copiarLinkPantalla} className="flex items-center gap-3 text-sm font-bold text-gray-700 hover:text-purple-600 transition p-4 bg-gray-50 rounded-xl border border-gray-100 shadow-sm w-full text-left">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>
                Link para Pantalla Gigante
              </button>
            </div>

            <div className="mt-auto border-t border-gray-100 pt-4">
              {esAnonimo ? (
                <button className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-md" onClick={() => alert('Próximamente login con Google')}>Iniciar Sesión</button>
              ) : (
                <p className="text-xs text-gray-400 text-center font-medium">Sesión: {usuarioNombre}</p>
              )}
            </div>
            
          </div>
        </div>
      )}

      {columnasMuro > 2 && (
        <div className="fixed bottom-28 right-6 z-20 animate-fade-in">
          <button 
            onClick={ciclarColumnas}
            className="w-12 h-12 bg-white/90 backdrop-blur-md text-zinc-700 rounded-full shadow-lg border border-gray-200 flex items-center justify-center transition active:scale-90"
            title="Agrandar vista"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
          </button>
        </div>
      )}

      {/* Botón flotante principal de + conectado al muro */}
      <div className="fixed bottom-10 w-full flex justify-center z-20 pointer-events-none">
        <button onClick={() => muroInputRef.current.click()} disabled={subiendo} className={`pointer-events-auto bg-blue-600 text-white w-16 h-16 rounded-full shadow-[0_10px_25px_rgba(37,99,235,0.4)] flex items-center justify-center text-4xl pb-1 hover:bg-blue-700 transition transform ${subiendo ? 'opacity-50 scale-95' : 'hover:-translate-y-1'}`}>
          {subiendo ? <span className="text-lg">⏳</span> : '+'}
        </button>
      </div>
    </div>
  );
}