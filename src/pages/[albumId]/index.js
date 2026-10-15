import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../firebase/config';
import { doc, getDoc, collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/firestore'; // Error here, fixing below
import { useAuthContext } from '../../context/AuthContext';
import { ref as storageRef, uploadBytes as storageUploadBytes, getDownloadURL as storageGetDownloadURL } from 'firebase/storage';


export default function MuroEvento() {
  const router = useRouter();
  const { albumId } = router.query;
  const { usuario } = useAuthContext();
  
  const [album, setAlbum] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [fotos, setFotos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);

  const fileInputRef = useRef(null);

  // Cargar datos del álbum
  useEffect(() => {
    if (!albumId) return;

    const cargarDatos = async () => {
      try {
        const docRef = doc(db, 'albums', albumId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAlbum(docSnap.data());
        } else {
          alert("El evento no existe.");
          router.push('/');
        }
        setCargando(false);
      } catch (error) {
        console.error("Error cargando evento:", error);
        setCargando(false);
      }
    };

    cargarDatos();
  }, [albumId, router]);

  // Escuchar fotos en tiempo real
  useEffect(() => {
    if (!albumId) return;

    const q = query(
      collection(db, 'albums', albumId, 'fotos'),
      orderBy('creadoEn', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fotosMuro = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFotos(fotosMuro);
    });

    return () => unsubscribe();
  }, [albumId]);

  const esAdmin = usuario && album && usuario.uid === album.adminId;

  // --- LÓGICA PARA SUBIR FOTOS ---
  const handleBotonMas = () => {
    fileInputRef.current.click();
  };

  const handleSeleccionArchivo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSubiendo(true);

    try {
      // 1. Crear referencia en Storage
      const extension = file.name.split('.').pop();
      const nombreArchivo = `${Date.now()}-${Math.random().toString(36).substring(2)}.${extension}`;
      const rutaStorage = storageRef(storage, `eventos/${albumId}/${nombreArchivo}`);

      // 2. Subir archivo
      await storageUploadBytes(rutaStorage, file);

      // 3. Obtener URL de descarga
      const urlDescarga = await storageGetDownloadURL(rutaStorage);

      // 4. Guardar en Firestore
      await addDoc(collection(db, 'albums', albumId, 'fotos'), {
        url: urlDescarga,
        tipo: file.type.startsWith('video/') ? 'video' : 'imagen',
        creadoEn: new Date(),
        subidoPor: usuario ? usuario.uid : 'invitado_anonimo'
      });

    } catch (error) {
      console.error("Error al subir el archivo:", error);
      alert("Hubo un error al subir la foto.");
    } finally {
      setSubiendo(false);
      // Limpiar el input para permitir subir la misma foto de nuevo si es necesario
      e.target.value = null;
    }
  };


  if (cargando) return <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center font-sans text-gray-400">Abriendo evento...</div>;
  if (!album) return null;

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans overflow-hidden relative">
      
      {/* Input oculto para la cámara */}
      <input 
        type="file" 
        accept="image/*,video/*" 
        capture="environment" 
        ref={fileInputRef} 
        onChange={handleSeleccionArchivo} 
        style={{ display: 'none' }} 
      />

      {/* --- CABECERA --- */}
      <header className="bg-white pt-4 pb-5 shadow-sm sticky top-0 z-10 rounded-b-[2rem] flex flex-col">
        
        <div className="flex items-center justify-between px-6">
          <button 
            onClick={() => router.push('/')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition"
          >
            ←
          </button>
          
          <div className="flex flex-col items-center flex-1 px-2 overflow-hidden">
            <h1 className="text-xl font-serif text-black text-center leading-tight truncate w-full">
              {album.nombreEvento}
            </h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1 font-medium truncate">
              {album.fechaEvento}
            </p>
          </div>
          
          <button 
            onClick={() => setMenuAbierto(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition text-2xl pb-2"
          >
            ⋮
          </button>
        </div>
      </header>

      {/* --- MENÚ LATERAL --- */}
      {menuAbierto && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={() => setMenuAbierto(false)}
        ></div>
      )}
      <div className={`fixed top-0 right-0 h-full w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${menuAbierto ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold font-serif text-black">Menú</h2>
            <button onClick={() => setMenuAbierto(false)} className="text-gray-400 text-3xl hover:text-black">×</button>
          </div>
          <div className="flex flex-col space-y-2 flex-1">
            {esAdmin ? (
              <>
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Administración</p>
                <button className="w-full text-left p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 font-medium text-gray-700 transition">⚙️ Configurar evento</button>
                <button className="w-full text-left p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 font-medium text-gray-700 transition">👥 Gestionar invitados</button>
                <div className="flex-1"></div>
                <button className="w-full text-left p-4 rounded-2xl bg-red-50 hover:bg-red-100 font-medium text-red-600 transition">🗑️ Eliminar álbum</button>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Opciones</p>
                <button className="w-full text-left p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 font-medium text-gray-700 transition">📤 Compartir (Link / QR)</button>
                <button className="w-full text-left p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 font-medium text-gray-700 transition">🏆 Ranking de fotos</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* --- MURO --- */}
      <main className="flex-1 p-6 overflow-y-auto pb-32">
        {fotos.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 animate-fade-in mt-20">
            <div className="text-6xl mb-4 opacity-50">👻</div>
            <p className="text-lg font-medium text-gray-500">Aún no hay fotos.</p>
            <p className="text-sm mt-1">¡Toca el botón y sé el primero!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 auto-rows-[200px]">
            {fotos.map((foto) => (
              <div key={foto.id} className="relative rounded-2xl overflow-hidden shadow-sm bg-gray-200">
                {foto.tipo === 'video' ? (
                  <video src={foto.url} className="w-full h-full object-cover" controls playsInline />
                ) : (
                  <img src={foto.url} alt="Momento del evento" className="w-full h-full object-cover" loading="lazy" />
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* --- BOTÓN FLOTANTE --- */}
      <div className="fixed bottom-10 w-full flex justify-center z-20">
        <button 
          onClick={handleBotonMas}
          disabled={subiendo}
          className={`bg-blue-600 text-white w-16 h-16 rounded-full shadow-[0_10px_25px_rgba(37,99,235,0.4)] flex items-center justify-center text-4xl pb-1 hover:bg-blue-700 transition transform ${subiendo ? 'opacity-50 cursor-not-allowed scale-95' : 'hover:-translate-y-1'}`}
        >
          {subiendo ? (
            <span className="text-lg font-bold">⏳</span>
          ) : (
            '+'
          )}
        </button>
      </div>
      
    </div>
  );
}