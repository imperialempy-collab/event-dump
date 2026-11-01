import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore'; 
import { useAuthContext } from '../../context/AuthContext';
import PanelStream from '../../components/director/PanelStream';
import MonitorTV from '../../components/director/MonitorTV'; 
import Carrete from '../../components/director/Carrete';

export default function PanelDirector() {
  const router = useRouter();
  const { albumId } = router.query;
  const { usuario } = useAuthContext();
  const [album, setAlbum] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [accesoDenegado, setAccesoDenegado] = useState(false);
  
  // ESTADO DEL QR INTEGRADO DIRECTAMENTE AQUÍ
  const [mostrarQR, setMostrarQR] = useState(false);

  useEffect(() => {
    if (!albumId) return;
    if (!usuario) {
      setAccesoDenegado(true);
      setCargando(false);
      return;
    }
    const verificarAcceso = async () => {
      try {
        const docRef = doc(db, 'albums', albumId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().adminId === usuario.uid) {
          setAlbum(docSnap.data());
        } else {
          setAccesoDenegado(true);
        }
      } catch (error) {
        setAccesoDenegado(true);
      } finally {
        setCargando(false);
      }
    };
    verificarAcceso();
  }, [albumId, usuario]);

  // ESCUCHADOR DEL QR INTEGRADO AL PANEL
  useEffect(() => {
    if (!albumId) return;
    const unsubscribe = onSnapshot(doc(db, 'albums', albumId), (docSnap) => {
      if (docSnap.exists() && docSnap.data().comandosTV) {
        setMostrarQR(docSnap.data().comandosTV.mostrarQR || false);
      }
    });
    return () => unsubscribe();
  }, [albumId]);

  // FUNCIÓN DEL BOTÓN INTEGRADA
  const toggleQR = async () => {
    try {
      await updateDoc(doc(db, 'albums', albumId), {
        'comandosTV.mostrarQR': !mostrarQR
      });
    } catch (error) {
      console.error("Error al actualizar QR:", error);
    }
  };

  if (cargando) return <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">Cargando Panel de Control...</div>;
  if (accesoDenegado || !usuario) return <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center"><h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1></div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col">
      <header className="bg-black border-b border-zinc-800 p-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push(`/${albumId}`)} className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition">←</button>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Panel de Producción</h1>
            <p className="text-xs text-zinc-400">Modo Director • {album.nombreEvento}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-4">
        
        {/* BOTÓN BRUTO Y DIRECTO PARA PROBAR LA LÓGICA */}
        <div className="bg-zinc-900 p-4 rounded-2xl border-2 border-dashed border-red-500 flex justify-between items-center shadow-lg">
          <div>
            <h2 className="font-bold text-red-400 text-lg">PROYECTOR DE QR</h2>
            <p className="text-xs text-zinc-400 mt-1">Botón directo sin subcomponentes.</p>
          </div>
          <button 
            onClick={toggleQR}
            className={`px-8 py-3 rounded-xl font-black tracking-widest text-white shadow-xl transition-all active:scale-95 ${mostrarQR ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}
          >
            {mostrarQR ? 'APAGAR QR' : 'ENCENDER QR'}
          </button>
        </div>
        
        <Carrete albumId={albumId} />

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 h-96">
            <MonitorTV albumId={albumId} />
            <PanelStream />
        </div>
      </main>
    </div>
  );
}