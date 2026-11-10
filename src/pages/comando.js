import { useState, useEffect } from 'react';
import { auth, db } from '../../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function ComandoAdmin() {
  const [adminLocal, setAdminLocal] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [emailBuscar, setEmailBuscar] = useState('');
  const [usuarioEncontrado, setUsuarioEncontrado] = useState(null);
  const [mensaje, setMensaje] = useState('');

  // 1. SEGURIDAD: VERIFICAR QUE EL USUARIO ES EL DUEÑO
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email === 'axelnm35@gmail.com') {
        setAdminLocal(user);
      } else {
        setAdminLocal(null);
      }
      setCargando(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. BUSCADOR DE USUARIOS EN LA BASE DE DATOS
  const buscarUsuario = async (e) => {
    e.preventDefault();
    setMensaje('Buscando...');
    setUsuarioEncontrado(null);

    try {
      const q = query(collection(db, 'usuarios'), where('email', '==', emailBuscar.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        setUsuarioEncontrado({ id: userDoc.id, ...userDoc.data() });
        setMensaje('Usuario encontrado.');
      } else {
        setMensaje('Usuario no existe en la base de datos. Pidele que inicie sesion en la web por primera vez.');
      }
    } catch (error) {
      setMensaje('Error al buscar: ' + error.message);
    }
  };

  // 3. ACTUALIZAR PASES DE EVENTOS (SUMAR O RESTAR)
  const actualizarCreditos = async (cantidad) => {
    if (!usuarioEncontrado) return;
    setMensaje('Actualizando creditos...');
    try {
      const creditosActuales = usuarioEncontrado.creditosDisponibles || 0;
      const nuevosCreditos = creditosActuales + cantidad;
      
      const userRef = doc(db, 'usuarios', usuarioEncontrado.id);
      await updateDoc(userRef, { creditosDisponibles: nuevosCreditos });
      
      setUsuarioEncontrado({ ...usuarioEncontrado, creditosDisponibles: nuevosCreditos });
      setMensaje('Creditos actualizados a: ' + nuevosCreditos);
    } catch (error) {
      setMensaje('Error: ' + error.message);
    }
  };

  // 4. CAMBIAR TIPO DE CUENTA (EVENTO PRIVADO <-> LOCAL SUSCRITO)
  const toggleSuscripcionLocal = async () => {
    if (!usuarioEncontrado) return;
    setMensaje('Actualizando plan de la cuenta...');
    try {
      const nuevoEstado = !usuarioEncontrado.esLocalSuscrito;
      const userRef = doc(db, 'usuarios', usuarioEncontrado.id);
      await updateDoc(userRef, { esLocalSuscrito: nuevoEstado });
      
      setUsuarioEncontrado({ ...usuarioEncontrado, esLocalSuscrito: nuevoEstado });
      setMensaje(nuevoEstado ? 'Suscripcion Mensual de Local ACTIVADA' : 'Suscripcion de Local DESACTIVADA');
    } catch (error) {
      setMensaje('Error: ' + error.message);
    }
  };

  if (cargando) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-bold tracking-widest text-xs">VERIFICANDO IDENTIDAD...</div>;

  if (!adminLocal) return <div className="min-h-screen bg-black text-zinc-800 flex items-center justify-center font-bold tracking-widest text-xl">404 - NOT FOUND</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-500 mb-2">Comando Central</h1>
        <p className="text-zinc-400 mb-8 text-sm">Acceso exclusivo de administrador: {adminLocal.email}</p>

        <div className="bg-zinc-900 p-6 rounded-2xl mb-6 border border-zinc-800 shadow-xl">
          <form onSubmit={buscarUsuario} className="flex gap-4">
            <input 
              type="email" 
              value={emailBuscar}
              onChange={(e) => setEmailBuscar(e.target.value)}
              placeholder="correo.del.cliente@gmail.com" 
              className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
              required
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-bold transition-all tracking-widest text-sm">
              BUSCAR
            </button>
          </form>
          {mensaje && <p className="mt-4 text-xs font-bold text-yellow-500 tracking-wide uppercase">{mensaje}</p>}
        </div>

        {usuarioEncontrado && (
          <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 flex flex-col gap-6 shadow-xl animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-white">{usuarioEncontrado.nombre || 'Usuario'}</h2>
              <p className="text-zinc-400 text-sm mt-1">{usuarioEncontrado.email}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* MODULO DE EVENTOS */}
              <div className="bg-black p-5 rounded-xl border border-zinc-800">
                <p className="text-zinc-500 text-xs font-bold tracking-widest mb-1">PASES DE EVENTO</p>
                <p className="text-4xl font-black text-white">{usuarioEncontrado.creditosDisponibles || 0}</p>
                <div className="flex gap-2 mt-5">
                  <button onClick={() => actualizarCreditos(1)} className="flex-1 bg-green-700 hover:bg-green-600 py-3 rounded-lg font-black text-xs transition">+1</button>
                  <button onClick={() => actualizarCreditos(2)} className="flex-1 bg-green-700 hover:bg-green-600 py-3 rounded-lg font-black text-xs transition">+2</button>
                  <button onClick={() => actualizarCreditos(-1)} className="flex-1 bg-red-900 hover:bg-red-800 py-3 rounded-lg font-black text-xs transition text-red-300">-1</button>
                </div>
              </div>

              {/* MODULO DE LOCALES */}
              <div className={`p-5 rounded-xl border transition-all ${usuarioEncontrado.esLocalSuscrito ? 'bg-blue-900/20 border-blue-500' : 'bg-black border-zinc-800'}`}>
                <p className="text-zinc-500 text-xs font-bold tracking-widest mb-1">TIPO DE CUENTA</p>
                <p className={`text-lg font-black tracking-wide ${usuarioEncontrado.esLocalSuscrito ? 'text-blue-400' : 'text-zinc-300'}`}>
                  {usuarioEncontrado.esLocalSuscrito ? 'LOCAL SUSCRITO' : 'BODAS / PRIVADOS'}
                </p>
                <button 
                  onClick={toggleSuscripcionLocal} 
                  className={`w-full mt-6 py-3 rounded-lg font-bold text-xs tracking-widest transition-all ${usuarioEncontrado.esLocalSuscrito ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg'}`}
                >
                  {usuarioEncontrado.esLocalSuscrito ? 'REVOCAR SUSCRIPCION' : 'ACTIVAR MODO LOCAL'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
