import { useState, useEffect } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { useAlbum } from '../hooks/useAlbum';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const { usuario, cerrarSesion } = useAuthContext();
  const { crearAlbum, cargando } = useAlbum();
  const router = useRouter();

  const [fecha, setFecha] = useState('');
  const [soloCamara, setSoloCamara] = useState(false);
  const [tieneRetos, setTieneRetos] = useState(true);

  // Proteger la ruta: Solo para usuarios con Email (Admin/Novios)
  useEffect(() => {
    if (!usuario) router.push('/');
  }, [usuario, router]);

  if (!usuario || !usuario.email) return null;

  const handleCrear = async (e) => {
    e.preventDefault();
    try {
      const config = { soloCamara, tieneRetos };
      // Llamamos a la base de datos para crear el álbum
      const nuevoAlbum = await crearAlbum(usuario.uid, fecha, config);
      alert('¡Álbum Creado con éxito en modo Prueba (24hs)!');
      // Lo enviamos a la vista del muro del álbum
      router.push(`/${nuevoAlbum.id}`);
    } catch (error) {
      alert('Error al crear: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-1">Panel de Control</h1>
        <p className="text-gray-500 mb-6 text-sm">Crea tu evento (Versión de Prueba)</p>
        
        <form onSubmit={handleCrear} className="space-y-4">
          <div>
            <label className="block font-bold mb-1 text-sm">Fecha del Evento</label>
            <input 
              type="date" 
              required 
              className="w-full border border-gray-300 p-2 rounded-lg" 
              value={fecha} 
              onChange={e => setFecha(e.target.value)} 
            />
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input 
              type="checkbox" 
              id="soloCam" 
              className="w-5 h-5"
              checked={soloCamara} 
              onChange={e => setSoloCamara(e.target.checked)} 
            />
            <label htmlFor="soloCam" className="text-sm">Forzar SOLO uso de cámara (bloquear galería)</label>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input 
              type="checkbox" 
              id="retos" 
              className="w-5 h-5"
              checked={tieneRetos} 
              onChange={e => setTieneRetos(e.target.checked)} 
            />
            <label htmlFor="retos" className="text-sm">Activar Ranking de Paparazzi (Retos)</label>
          </div>

          <button 
            type="submit" 
            disabled={cargando} 
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg mt-6 hover:bg-blue-700 transition"
          >
            {cargando ? 'Creando evento...' : 'Generar Álbum'}
          </button>
        </form>
        
        <button 
          onClick={() => { cerrarSesion(); router.push('/'); }} 
          className="w-full text-red-500 mt-6 text-sm font-bold hover:underline"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}