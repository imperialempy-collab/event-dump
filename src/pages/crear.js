import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthContext } from '../context/AuthContext';
import { useAlbum } from '../hooks/useAlbum';
import { storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function CrearEvento() {
  const { usuario } = useAuthContext();
  const { crearAlbum } = useAlbum();
  const router = useRouter();
  
  const [paso, setPaso] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [mostrarPaywall, setMostrarPaywall] = useState(false);

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

      // Llamada atómica a useAlbum (valida saldo en usuarios/{email} y descuenta crédito)
      const nuevoAlbum = await crearAlbum(
        usuario.uid,
        usuario.email,
        fecha,
        {
          nombreEvento: nombre,
          tipoEvento: tipo,
          portadaUrl: portadaUrl,
          permiteDescargas: true,
          permiteComentarios: true,
          permiteLikes: true,
          tieneRetos: true
        }
      );

      router.push(`/${nuevoAlbum.id}`);
    } catch (error) {
      console.error("Error al crear el álbum:", error);
      if (error.code === 'SIN_CREDITOS' || error.message === 'SIN_CREDITOS') {
        setMostrarPaywall(true);
      } else {
        alert('Error al crear el álbum: ' + (error.message || 'Inténtalo de nuevo.'));
      }
      setCargando(false);
    }
  };

  const mensajeWhatsApp = encodeURIComponent(
    `¡Hola! Quiero activar un pase de evento en Event-Dump.\nMi correo es: ${usuario.email}`
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center p-6 font-sans text-gray-800">
      
      {/* BARRA SUPERIOR DE NAVEGACIÓN */}
      <div className="w-full max-w-md pt-4 flex items-center mb-8">
        <button 
          onClick={() => {
            if (mostrarPaywall) setMostrarPaywall(false);
            else if (paso === 2) setPaso(1);
            else router.push('/');
          }} 
          className="text-2xl text-gray-600 font-bold"
        >
          ←
        </button>
        <div className="flex-1 flex justify-center gap-2">
          <div className={`h-1 w-8 rounded-full ${paso >= 1 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          <div className={`h-1 w-8 rounded-full ${paso >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
        </div>
        <div className="w-6"></div>
      </div>

      <div className="w-full max-w-md flex flex-col flex-1">
        
        {/* MODAL / VISTA DE PAGO (PAYWALL) CUANDO EL SALDO ES CERO */}
        {mostrarPaywall ? (
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 flex flex-col items-center text-center animate-fade-in">
            <span className="text-5xl mb-4">🎟️</span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Casi listo para tu evento!</h2>
            <p className="text-gray-500 text-sm mb-6">
              Para publicar tu álbum sin límites y permitir que todos tus invitados suban fotos en vivo, selecciona tu plan de evento.
            </p>

            <div className="w-full space-y-4 mb-6">
              {/* PLAN 1 EVENTO */}
              <div className="border border-gray-200 rounded-2xl p-4 text-left relative bg-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Plan Individual</p>
                <div className="flex justify-between items-baseline mt-1">
                  <h3 className="text-lg font-bold text-gray-900">1 Evento Privado</h3>
                  <span className="text-xl font-black text-blue-600">330.000 Gs</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Acceso total, descargas en HD y QR ilimitado.</p>
              </div>

              {/* PLAN 2 EVENTOS (OFERTA) */}
              <div className="border-2 border-blue-600 rounded-2xl p-4 text-left relative bg-blue-50/40">
                <span className="absolute -top-3 right-4 bg-blue-600 text-white text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase">
                  Más Popular
                </span>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Paquete Dúo</p>
                <div className="flex justify-between items-baseline mt-1">
                  <h3 className="text-lg font-bold text-gray-900">2 Eventos</h3>
                  <span className="text-xl font-black text-blue-600">450.000 Gs</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">Ideal para previas, bodas y fiestas dobles.</p>
              </div>
            </div>

            <a 
              href={`https://wa.me/?text=${mensajeWhatsApp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-full shadow-lg transition flex items-center justify-center gap-2 mb-3"
            >
              <span>💬</span> Confirmar y Solicitar Pase por WhatsApp
            </a>

            <button 
              onClick={() => setMostrarPaywall(false)}
              className="text-xs text-gray-400 hover:text-gray-600 font-medium py-2"
            >
              Volver al borrador
            </button>
          </div>
        ) : (
          <>
            {/* PASO 1: SELECCIÓN DEL TIPO DE EVENTO */}
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

            {/* PASO 2: PERSONALIZACIÓN DEL EVENTO */}
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
                  {cargando ? 'Verificando saldo...' : 'Continuar y Crear Álbum'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
