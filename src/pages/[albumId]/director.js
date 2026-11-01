import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthContext } from '../../context/AuthContext';
import PanelStream from '../../components/director/PanelStream';
import MonitorTV from '../../components/director/MonitorTV'; 
import Carrete from '../../components/director/Carrete'; // <-- 1. IMPORTAMOS EL CARRETE

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
        
        {/* 2. EL CARRETE DE MODERACIÓN REAL */}
        <Carrete albumId={albumId} />

        {/* Monitores y controles */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-96">
            <MonitorTV albumId={albumId} />
            <PanelStream />
            <section className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 flex flex-col h-full">
                <h2 className="text-sm font-bold text-zinc-400 mb-2 uppercase tracking-widest">Botonera Master</h2>
                <div className="flex-1 border border-dashed border-zinc-700 rounded-xl flex items-center justify-center text-zinc-600 text-sm">Aquí irá BotoneraMaster.js</div>
            </section>
        </div>
      </main>
    </div>
  );
}