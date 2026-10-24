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
    // 1. Leer los álbumes que el celular visitó recientemente
    const localAlbums = JSON.parse(localStorage.getItem('visitedAlbums') || '[]');

    if (usuario) {
      const cargarAlbumes = async () => {
        try {
          const q = query(collection(db, 'albums'), where('adminId', '==', usuario.uid));
          const querySnapshot = await getDocs(q);
          const albumesAdmin = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          albumesAdmin.sort((a, b) => (b.creadoEn?.toMillis() || 0) - (a.creadoEn?.toMillis() || 0));

          // Juntar los álbumes propios con los visitados como invitado (sin duplicar)
          const combinados = [...albumesAdmin];
          localAlbums.forEach(local => {
            if (!combinados.find(a => a.id === local.id)) {
              combinados.push(local);
            }
          });
          setMisAlbumes(combinados);
        } catch(error) {
          console.error("Error al cargar álbumes", error);
        }
      }
      cargarAlbumes();
    } else {
      // Si no ha iniciado sesión, solo le mostramos los que visitó
      setMisAlbumes(localAlbums);
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

        {/* TARJETA REDISEÑADA: Crear Álbum (Imagen Gigante Borde a Borde) */}
        <button 
          onClick={handleCrearAlbum}
          disabled={cargando}
          className="w-full bg-white rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 flex flex-col items-center mb-6 hover:shadow-md transition transform hover:-translate-y-1"
        >
          {/* Contenedor de la imagen sin padding lateral, ocupando 100% */}
          <div className="w-full flex items-center justify-center pt-8 bg-gray-50/50">
            <img 
              src="/fotitos_portada.png" 
              alt="Crear Evento" 
              className="w-full h-auto object-cover transform scale-110 drop-shadow-sm" 
            />
          </div>
          
          {/* Textos abajo con su propio padding */}
          <div className="p-8 pt-6 pb-10 flex flex-col items-center w-full relative z-10 bg-white">
            <h2 className="text-2xl font-bold text-gray-900">Crear álbum de evento</h2>
            <p className="text-gray-400 text-sm mt-2">Bodas, cumpleaños, viajes...</p>
          </div>
        </button>

        {/* Tarjeta: Información (Misterio puro) */}
        <button 
          onClick={() => router.push('/info')}
          className="w-full bg-white rounded-[2rem] py-10 shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:shadow-md transition"
        >
          <div className="text-6xl font-serif text-blue-600">¿?</div>
        </button>

        {/* Sección: Mis Álbumes o Álbumes Visitados */}
        {misAlbumes.length > 0 && (
          <div className="w-full mt-10 animate-fade-in pb-10">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-2">
              {usuario ? 'Mis Álbumes y Visitados' : 'Álbumes Visitados'}
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
                    <h4 className="font-bold text-gray-800 truncate notranslate" translate="no">{album.nombreEvento}</h4>
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