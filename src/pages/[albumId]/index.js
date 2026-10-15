import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthContext } from '../../context/AuthContext';

export default function MuroEvento() {
  const router = useRouter();
  const { albumId } = router.query;
  const { usuario } = useAuthContext();
  
  const [album, setAlbum] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const [historias, setHistorias] = useState([
    { id: 1, url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=150&q=80', visto: false },
    { id: 2, url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=150&q=80', visto: false },
    { id: 3, url: 'https://images.unsplash.com/photo-1533174000273-1110a114f292?auto=format&fit=crop&w=150&q=80', visto: true },
    { id: 4, url: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=150&q=80', visto: true },
    { id: 5, url: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=150&q=80', visto: true },
  ]);

  const historiasOrdenadas = [...historias].sort((a, b) => (a.visto === b.visto ? 0 : a.visto ? 1 : -1));

  const verHistoria = (id) => {
    setHistorias(prev => prev.map(h => h.id === id ? { ...h, visto: true } : h));
    alert('Abriendo historia... (Al cerrar, verás que el borde se pone gris y se va al fondo del listado).');
  };

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

  const esAdmin = usuario && album && usuario.uid === album.adminId;

  if (cargando) return <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center font-sans text-gray-400">Abriendo evento...</div>;
  if (!album) return null;

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans overflow-hidden">
      
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

        <div className="flex gap-3 overflow-x-auto mt-6 px-6 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          {historiasOrdenadas.map(historia => (
            <button
              key={historia.id}
              onClick={() => verHistoria(historia.id)}
              className={`flex-shrink-0 relative rounded-[16px] p-[2px] transition-all duration-500 transform hover:scale-95 ${
                historia.visto ? 'bg-gray-200' : 'bg-blue-500' 
              }`}
            >
              <div className="w-14 h-20 bg-white rounded-[14px] overflow-hidden border-[2px] border-white relative">
                <img 
                  src={historia.url} 
                  alt="Historia" 
                  className={`w-full h-full object-cover transition-opacity duration-300 ${historia.visto ? 'opacity-50' : 'opacity-100'}`} 
                />
              </div>
            </button>
          ))}
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
      <main className="flex-1 p-6 flex flex-col items-center justify-center">
        <div className="text-center text-gray-400 animate-fade-in">
          <div className="text-6xl mb-4 opacity-50">👻</div>
          <p className="text-lg font-medium text-gray-500">Aún no hay fotos.</p>
          <p className="text-sm mt-1">¡Abre la cámara y sé el primero!</p>
        </div>
      </main>

      {/* --- BOTÓN FLOTANTE (Modificado a signo más) --- */}
      <div className="fixed bottom-10 w-full flex justify-center pointer-events-none z-0">
        <button 
          onClick={() => alert("¡Aquí abriremos la cámara nativa!")}
          className="pointer-events-auto bg-blue-600 text-white w-16 h-16 rounded-full shadow-[0_10px_25px_rgba(37,99,235,0.4)] flex items-center justify-center text-4xl pb-1 hover:bg-blue-700 hover:-translate-y-1 transition transform"
        >
          +
        </button>
      </div>
      
    </div>
  );
}