import { useAuthContext } from '../context/AuthContext';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function Home() {
  const { usuario, loginConGoogle } = useAuthContext();
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [misAlbumes, setMisAlbumes] = useState([]);

  useEffect(() => {
    if (usuario) {
      const cargarAlbumes = async () => {
        try {
          const q = query(collection(db, 'albums'), where('adminId', '==', usuario.uid));
          const querySnapshot = await getDocs(q);
          const albumes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          albumes.sort((a, b) => b.creadoEn?.toMillis() - a.creadoEn?.toMillis());
          setMisAlbumes(albumes);
        } catch(error) {
          console.error("Error al cargar álbumes", error);
        }
      }
      cargarAlbumes();
    } else {
      setMisAlbumes([]);
    }
  }, [usuario]);

  const handleCrearAlbum = async () => {
    setCargando(true);
    if (!usuario || !usuario.email) {
      try {
        await loginConGoogle();
        router.push('/crear');
      } catch (error) {
        console.error(error);
        setCargando(false);
      }
    } else {
      router.push('/crear');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center p-6 font-sans text-gray-800">
      <div className="w-full max-w-md mt-12 flex flex-col items-center">
        
        {/* Título Principal protegido contra traducciones */}
        <div className="mb-10 text-center notranslate" translate="no">
          <h1 className="text-4xl font-serif text-black tracking-tight font-bold">
            Event-Dump
          </h1>
          <h2 className="text-sm font-sans text-gray-500 tracking-[0.4em] mt-2 font-medium">
            LQNSP
          </h2>
        </div>

        {/* Tarjeta: Crear Álbum (con la nueva imagen fotitos_portada.png) */}
        <button 
          onClick={handleCrearAlbum}
          disabled={cargando}
          className="w-full bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col items-center gap-3 mb-6 hover:shadow-md transition transform hover:-translate-y-1"
        >
          <div className="w-20 h-20 mb-2 flex items-center justify-center">
            {/* Buscamos la imagen en la carpeta public */}
            <img src="/fotitos_portada.png" alt="Crear Evento" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-xl font-bold">Crear álbum de evento</h2>
          <p className="text-gray-400 text-sm">Bodas, cumpleaños, viajes...</p>
        </button>

        {/* Tarjeta: Información (Misterio puro) */}
        <button 
          onClick={() => router.push('/info')}
          className="w-full bg-white rounded-[2rem] py-10 shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:shadow-md transition"
        >
          <div className="text-6xl font-serif text-blue-600">¿?</div>
        </button>

        {/* Sección: Mis Álbumes */}
        {usuario && misAlbumes.length > 0 && (
          <div className="w-full mt-10 animate-fade-in pb-10">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-2">
              Mis Álbumes
            </h3>
            <div className="space-y-3">
              {misAlbumes.map(album => (
                <button
                  key={album.id}
                  onClick={() => router.push(`/${album.id}`)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition"
                >
                  <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {album.portadaUrl ? (
                      <img src={album.portadaUrl} alt="Portada" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">📸</span>
                    )}
                  </div>
                  <div className="flex-1 text-left overflow-hidden">
                    <h4 className="font-bold text-gray-800 truncate">{album.nombreEvento}</h4>
                    <p className="text-xs text-gray-400 mt-1">{album.fechaEvento}</p>
                  </div>
                  <div className="text-gray-300 text-xl flex-shrink-0">→</div>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}