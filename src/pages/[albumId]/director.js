import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthContext } from '../../context/AuthContext';

export default function PanelDirector() {
  const router = useRouter();
  const { albumId } = router.query;
  const { usuario } = useAuthContext();
  const [album, setAlbum] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [accesoDenegado, setAccesoDenegado] = useState(false);

  useEffect(() => {
    if (!albumId || !usuario) return;

    const verificarAcceso = async () => {
      try {
        const docRef = doc(db, 'albums', albumId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          // El candado: ¿El que está intentando entrar es el dueño?
          if (data.adminId === usuario.uid) {
            setAlbum(data);
          } else {
            setAccesoDenegado(true);
          }
        } else {
          setAccesoDenegado(true);
        }
      } catch (error) {
        console.error("Error verificando acceso:", error);
        setAccesoDenegado(true);
      } finally {
        setCargando(false);
      }
    };

    verificarAcceso();
  }, [albumId, usuario]);

  if (cargando) {
    return <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">Cargando Panel de Control...</div>;
  }

  if (accesoDenegado || !usuario) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <span className="text-6xl mb-4">🔒</span>
        <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
        <p className="text-zinc-400 mb-6">Esta zona es exclusiva para el director del evento.</p>
        <button 
          onClick={() => router.push(`/${albumId}`)}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-500 transition"
        >
          Volver al Álbum
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col">
      {/* Barra superior negra (Cabecera) */}
      <header className="bg-black border-b border-zinc-800 p-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push(`/${albumId}`)}
            className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Panel de Producción</h1>
            <p className="text-xs text-zinc-400">Modo Director • {album.nombreEvento}</p>
          </div>
        </div>
        
        {/* Aquí irá el contador de pantallas */}
        <div className="bg-zinc-900 px-4 py-1.5 rounded-full flex items-center gap-2 border border-zinc-800">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
           <span className="text-xs font-bold text-zinc-300 tracking-wider">EN VIVO</span>
        </div>
      </header>

      {/* Grid del modo director */}
      <main className="flex-1 p-4 flex flex-col gap-4">
        {/* Cuadro donde irá la lista negra (El Carrete) */}
        <section className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 h-64 flex flex-col">
           <h2 className="text-sm font-bold text-zinc-400 mb-2 uppercase tracking-widest">Carrete de Publicaciones</h2>
           <div className="flex-1 border border-dashed border-zinc-700 rounded-xl flex items-center justify-center text-zinc-600 text-sm">
             Aquí pondremos la lista de fotos para ocultarlas
           </div>
        </section>

        {/* Zona inferior dividida en 2 */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Monitor */}
            <section className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 flex flex-col">
                <h2 className="text-sm font-bold text-zinc-400 mb-2 uppercase tracking-widest">Monitor TV (Previo)</h2>
                <div className="flex-1 border border-dashed border-zinc-700 rounded-xl flex items-center justify-center text-zinc-600 text-sm">
                    Aquí conectaremos el visualizador en vivo
                </div>
            </section>

            {/* Botonera Master */}
            <section className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 flex flex-col">
                <h2 className="text-sm font-bold text-zinc-400 mb-2 uppercase tracking-widest">Master Control</h2>
                <div className="flex-1 grid grid-cols-2 gap-3 content-start">
                    <button className="bg-zinc-800 hover:bg-zinc-700 p-4 rounded-xl text-left transition border border-zinc-700">
                        <div className="text-2xl mb-2">📸</div>
                        <div className="text-sm font-bold text-white">Mostrar QR</div>
                        <div className="text-xs text-zinc-500">Inyectar en pantalla</div>
                    </button>
                    <button className="bg-zinc-800 hover:bg-zinc-700 p-4 rounded-xl text-left transition border border-zinc-700">
                        <div className="text-2xl mb-2">🎲</div>
                        <div className="text-sm font-bold text-white">Lanzar Reto</div>
                        <div className="text-xs text-zinc-500">Sorteo en vivo</div>
                    </button>
                    <button className="bg-blue-600 hover:bg-blue-500 p-4 rounded-xl text-left transition col-span-2 shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                        <div className="text-2xl mb-2">🎥</div>
                        <div className="text-sm font-bold text-white">Activar Roaming Cam</div>
                        <div className="text-xs text-blue-200">WebRTC Directo a TV</div>
                    </button>
                </div>
            </section>
        </div>
      </main>
    </div>
  );
}