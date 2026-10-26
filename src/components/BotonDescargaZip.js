import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function BotonDescargaZip({ albumId, nombreEvento }) {
  const [descargando, setDescargando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [estado, setEstado] = useState('');

  const descargarTodo = async () => {
    setDescargando(true);
    setEstado('Recolectando archivos...');
    setProgreso(0);

    try {
      // 1. Traer todas las fotos/videos ordenados desde el más antiguo al más nuevo (Cronología)
      const q = query(collection(db, 'albums', albumId, 'fotos'), orderBy('creadoEn', 'asc'));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        alert("No hay fotos en este álbum para descargar.");
        setDescargando(false);
        return;
      }

      const zip = new JSZip();
      const total = snapshot.docs.length;
      let contador = 1;

      // 2. Descargar uno por uno y meterlo al ZIP
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const url = data.url;
        
        // Detectar si es foto o video
        const extension = data.tipo === 'video' ? '.mp4' : '.jpg';
        
        // Magia Cronológica: Nombramos los archivos 0001_..., 0002_...
        const numeroSecuencia = String(contador).padStart(4, '0');
        const nombreArchivo = `${numeroSecuencia}_${nombreEvento.replace(/\s+/g, '_')}${extension}`;

        setEstado(`Descargando ${contador} de ${total}...`);

        try {
          const respuesta = await fetch(url);
          const blob = await respuesta.blob();
          zip.file(nombreArchivo, blob);
        } catch (err) {
          console.error(`No se pudo descargar ${url}`, err);
          // Si una falla, continuamos con la siguiente
        }

        setProgreso(Math.round((contador / total) * 100));
        contador++;
      }

      // 3. Empaquetar y descargar el ZIP
      setEstado('Comprimiendo archivo ZIP (esto puede tardar unos segundos)...');
      const contenidoZip = await zip.generateAsync({ type: 'blob' });
      
      saveAs(contenidoZip, `${nombreEvento.replace(/\s+/g, '_')}_Completo.zip`);
      
      setEstado('¡Descarga completada!');
      setTimeout(() => setDescargando(false), 3000);

    } catch (error) {
      console.error(error);
      alert("Hubo un error al crear el ZIP.");
      setDescargando(false);
    }
  };

  return (
    <button
      onClick={descargarTodo}
      disabled={descargando}
      className={`w-full py-3 px-4 rounded-xl font-bold text-sm tracking-widest uppercase transition ${
        descargando 
          ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
          : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-md'
      }`}
    >
      {descargando ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {estado} {progreso > 0 && progreso < 100 ? `${progreso}%` : ''}
        </span>
      ) : (
        '📦 Descargar Álbum en ZIP'
      )}
    </button>
  );
}