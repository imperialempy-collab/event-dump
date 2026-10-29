import { useState } from 'react';

export default function PanelStream() {
  const [camaraConectada, setCamaraConectada] = useState(false);
  const [enElAire, setEnElAire] = useState(false);

  const conectarCamara = () => {
    // Aquí luego irá la lógica WebRTC real para prender el lente
    setCamaraConectada(true);
  };

  const desconectarCamara = () => {
    setCamaraConectada(false);
    setEnElAire(false); // Si apago la cámara, lógicamente salgo del aire
  };

  const alternarTransmisionTV = () => {
    // Aquí luego cambiaremos la variable en Firebase que la TV gigante lee
    setEnElAire(!enElAire);
  };

  return (
    <section className="bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col overflow-hidden shadow-lg h-full">
      {/* Cabecera del panel */}
      <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          🎥 Cámara Roaming
        </h2>
        {/* Semáforo de estado */}
        <div className="flex items-center gap-2">
          {camaraConectada ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              Dispositivo Conectado
            </span>
          ) : (
            <span className="text-xs font-bold text-zinc-500 bg-zinc-800 px-2 py-1 rounded-md">
              Desconectado
            </span>
          )}
        </div>
      </div>

      {/* Pantallita Preview del Stream */}
      <div className="flex-1 bg-black relative flex items-center justify-center p-2">
        {!camaraConectada ? (
          <div className="text-center">
            <div className="text-4xl mb-2 opacity-50">📵</div>
            <p className="text-xs text-zinc-500">Cámara inactiva</p>
          </div>
        ) : (
          <div className={`w-full h-full rounded-lg border-2 overflow-hidden relative transition-colors ${enElAire ? 'border-red-500' : 'border-zinc-700'}`}>
            {/* Aquí irá la etiqueta <video> real de tu lente */}
            <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center text-zinc-400 text-xs">
              [Preview de la cámara en vivo]
            </div>
            
            {enElAire && (
              <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-black tracking-widest px-2 py-0.5 rounded shadow-md animate-pulse">
                AL AIRE EN TV
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900 flex flex-col gap-2">
        {!camaraConectada ? (
          <button 
            onClick={conectarCamara}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold py-2.5 rounded-xl transition border border-zinc-700"
          >
            Conectar Dispositivo de Video
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={alternarTransmisionTV}
              className={`flex-1 text-sm font-bold py-2.5 rounded-xl transition shadow-md ${
                enElAire 
                  ? 'bg-red-600 hover:bg-red-500 text-white' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {enElAire ? 'Detener Transmisión' : 'Ponchar en Pantalla Gigante'}
            </button>
            <button 
              onClick={desconectarCamara}
              className="w-12 bg-zinc-800 hover:bg-red-900/50 text-zinc-400 hover:text-red-400 border border-zinc-700 rounded-xl flex items-center justify-center transition"
              title="Apagar Cámara"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </section>
  );
}