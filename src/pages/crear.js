import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthContext } from '../context/AuthContext';
import { db, storage } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function CrearEvento() {
  const { usuario } = useAuthContext();
  const router = useRouter();
  
  const [paso, setPaso] = useState(1);
  const [cargando, setCargando] = useState(false);

  const [tipo, setTipo] = useState('');
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState('');
  const [fotoPortada, setFotoPortada] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);

  useEffect(() => {
    if (usuario === null) router.push('/');
  }, [usuario, router]);

  if (!usuario) return null;

  const handleSeleccionarTipo = (seleccion) => {
    setTipo(seleccion);
    setPaso(2);
  };

  const handleFoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFotoPortada(file);
      setPreviewURL(URL.createObjectURL(file));
    }
  };

  const handleCrear = async () => {
    if (!nombre || !fecha) return alert('Por favor, completa el nombre y la fecha.');
    setCargando(true);

    try {
      let portadaUrl = '';
      if (fotoPortada) {
        const storageRef = ref(storage, `portadas/${Date.now()}-${fotoPortada.name}`);
        await uploadBytes(storageRef, fotoPortada);
        portadaUrl = await getDownloadURL(storageRef);
      }

      const docRef = await addDoc(collection(db, 'albums'), {
        adminId: usuario.uid,
        tipoEvento: tipo,
        nombreEvento: nombre,
        fechaEvento: fecha,
        portadaUrl: portadaUrl,
        creadoEn: serverTimestamp(),
        fechaExpiracion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

      router.push(`/${docRef.id}`);
    } catch (error) {
      console.error(error);
      alert('Error al crear el álbum.');
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center p-6 font-sans text-gray-800">
      
      <div className="w-full max-w-md pt-4 flex items-center mb-8">
        <button onClick={() => paso === 1 ? router.push('/') : setPaso(1)} className="text-2xl text-gray-600">
          ←
        </button>
        <div className="flex-1 flex justify-center gap-2">
          <div className={`h-1 w-8 rounded-full ${paso >= 1 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          <div className={`h-1 w-8 rounded-full ${paso >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
        </div>
        <div className="w-6"></div>
      </div>

      <div className="w-full max-w-md flex flex-col flex-1">
        
        {paso === 1 && (
          <div className="animate-fade-in">
            <h1 className="text-3xl font-serif text-center mb-10 text-black">
              ¡Genial! ¿Qué tipo de evento es?
            </h1>
            
            <div className="space-y-4">
              {['Boda', 'Cumpleaños', 'Viaje', 'Celebración', 'Otros'].map((opcion) => (
                <button 
                  key={opcion}
                  onClick={() => handleSeleccionarTipo(opcion)}
                  className="w-full bg-[#e9ecef] text-gray-700 py-4 rounded-full font-medium text-lg hover:bg-gray-300 transition"
                >
                  {opcion}
                </button>
              ))}
            </div>
          </div>
        )}

        {paso === 2 && (
          <div className="flex flex-col flex-1 animate-fade-in">
            <h1 className="text-2xl font-serif text-center mb-2 text-black">
              Personaliza tu evento
            </h1>
            <p className="text-center text-gray-500 mb-8 text-sm">
              Así se verá tu álbum de evento.
            </p>

            <div className="relative w-full h-64 bg-gray-200 rounded-3xl mb-8 overflow-hidden flex items-center justify-center shadow-inner group">
              {previewURL ? (
                <img src={previewURL} alt="Portada" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400">Sin foto de portada</span>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent"></div>
              
              <label className="absolute bottom-4 bg-[#e9ecef] px-6 py-2 rounded-full font-medium text-gray-700 cursor-pointer shadow-md hover:bg-gray-300 transition z-10">
                📷 Editar foto de portada
                <input type="file" accept="image/*" className="hidden" onChange={handleFoto} />
              </label>
            </div>

            <div className="space-y-6 flex-1">
              <input 
                type="text" 
                placeholder="¿Cómo se llama tu evento?" 
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-transparent border-b-2 border-gray-300 py-3 text-center text-xl text-black placeholder-gray-400 outline-none focus:border-blue-500 transition"
              />
              <div className="text-center">
                <label className="text-xs text-gray-400 uppercase tracking-wide">Fecha del Evento</label>
                <input 
                  type="date" 
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-gray-300 py-3 text-center text-xl text-black outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <button 
              onClick={handleCrear}
              disabled={cargando}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-full mt-8 shadow-lg shadow-blue-200 hover:bg-blue-700 transition"
            >
              {cargando ? 'Creando Álbum...' : 'Continuar y Crear Álbum'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}