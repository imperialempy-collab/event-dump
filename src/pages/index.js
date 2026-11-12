import Head from 'next/head';
import { useRouter } from 'next/router';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-blue-200">
      <Head>
        <title>Event-Dump | Álbum de fotos compartido por QR en Paraguay</title>
        <meta name="description" content="Tus invitados escanean el QR y comparten fotos y videos de tu boda, cumpleaños o evento en tiempo real. Sin descargar apps." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* BARRA DE NAVEGACIÓN */}
      <nav className="w-full max-w-6xl mx-auto px-6 py-6 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
        <div className="text-2xl font-black tracking-tighter notranslate" translate="no">Event-Dump</div>
        <button 
          onClick={() => router.push('/app')}
          className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-5 py-2 rounded-full font-bold text-sm transition"
        >
          Iniciar Sesión
        </button>
      </nav>

      {/* HERO SECTION */}
      <header className="w-full max-w-6xl mx-auto px-6 pt-20 pb-28 text-center flex flex-col items-center animate-fade-in">
        <div className="inline-block bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest mb-6 border border-blue-100">
          LA TENDENCIA EN EVENTOS 2026
        </div>
        <h1 className="text-5xl md:text-7xl font-serif text-black leading-tight mb-6">
          El álbum digital de <br className="hidden md:block"/> tu evento en vivo.
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Tus invitados escanean un código QR en sus mesas y comparten todas las fotos y videos que toman con sus celulares. Sin registros, sin descargar aplicaciones.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <button 
            onClick={() => router.push('/app')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-full shadow-xl shadow-blue-200 transition transform hover:-translate-y-1 text-lg"
          >
            Crear Álbum Ahora
          </button>
          <button 
            onClick={() => router.push('/app')}
            className="bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-800 font-bold py-4 px-10 rounded-full transition text-lg"
          >
            Ver mis eventos
          </button>
        </div>
      </header>

      {/* SECCIÓN: ¿CÓMO FUNCIONA? */}
      <section className="bg-gray-50 py-24 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4">¿Cómo funciona Event-Dump?</h2>
            <p className="text-gray-500 text-lg">Diseñado para bodas, cumpleaños y locales nocturnos.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Paso 1 */}
            <div className="bg-white p-10 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 flex items-center justify-center rounded-2xl text-2xl font-black mb-6">1</div>
              <h3 className="text-xl font-bold mb-3">Crea tu evento</h3>
              <p className="text-gray-500 leading-relaxed">Personaliza el nombre, sube una foto de portada y obtén tu código QR exclusivo al instante.</p>
            </div>
            {/* Paso 2 */}
            <div className="bg-white p-10 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 flex items-center justify-center rounded-2xl text-2xl font-black mb-6">2</div>
              <h3 className="text-xl font-bold mb-3">Imprime el QR</h3>
              <p className="text-gray-500 leading-relaxed">Coloca el código impreso en los centros de mesa, en la entrada o proyéctalo en pantallas gigantes.</p>
            </div>
            {/* Paso 3 */}
            <div className="bg-white p-10 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 flex items-center justify-center rounded-2xl text-2xl font-black mb-6">3</div>
              <h3 className="text-xl font-bold mb-3">Tus invitados suben todo</h3>
              <p className="text-gray-500 leading-relaxed">Al escanear, la cámara se abre en el navegador. Las fotos caen al álbum en tiempo real para descargar.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN FINAL */}
      <section className="py-24 text-center px-6">
        <h2 className="text-3xl md:text-4xl font-black mb-6">Inmortaliza los mejores momentos</h2>
        <p className="text-gray-500 max-w-lg mx-auto mb-10 text-lg">
          Ya sea una boda íntima o el boliche más grande del país, recolecta cada recuerdo desde la perspectiva de tus invitados.
        </p>
        <button 
          onClick={() => router.push('/app')}
          className="bg-black hover:bg-gray-800 text-white font-bold py-4 px-10 rounded-full transition transform hover:-translate-y-1 text-lg shadow-xl"
        >
          Empezar mi primer álbum
        </button>
      </section>
      
      {/* PIE DE PÁGINA */}
      <footer className="border-t border-gray-100 py-10 text-center text-gray-400 text-sm">
        <p>© {new Date().getFullYear()} Event-Dump Paraguay. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
