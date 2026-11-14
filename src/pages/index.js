import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  QrCode,
  Tv,
  Flame,
  Heart,
  Sparkles,
  Camera,
  Download,
  Zap,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
  Play,
  RotateCw,
  PartyPopper,
  Users,
  MessageCircle,
  X,
  Star,
  Smartphone,
  Lock,
  Award,
  Share2
} from 'lucide-react';

const PARTICULAS_TV = [
  { id: 1, left: '6%', dur: '14s', delay: '-2s', size: '3px', opacity: 0.5 },
  { id: 2, left: '14%', dur: '19s', delay: '-8s', size: '4px', opacity: 0.7 },
  { id: 3, left: '22%', dur: '12s', delay: '-4s', size: '2px', opacity: 0.4 },
  { id: 4, left: '31%', dur: '22s', delay: '-11s', size: '5px', opacity: 0.6 },
  { id: 5, left: '39%', dur: '16s', delay: '-6s', size: '3px', opacity: 0.5 },
  { id: 6, left: '47%', dur: '25s', delay: '-15s', size: '4px', opacity: 0.7 },
  { id: 7, left: '54%', dur: '13s', delay: '-1s', size: '2px', opacity: 0.4 },
  { id: 8, left: '62%', dur: '18s', delay: '-9s', size: '5px', opacity: 0.6 },
  { id: 9, left: '70%', dur: '15s', delay: '-5s', size: '3px', opacity: 0.5 },
  { id: 10, left: '78%', dur: '21s', delay: '-13s', size: '4px', opacity: 0.7 },
  { id: 11, left: '86%', dur: '14s', delay: '-3s', size: '3px', opacity: 0.5 },
  { id: 12, left: '93%', dur: '20s', delay: '-10s', size: '4px', opacity: 0.6 },
  { id: 13, left: '18%', dur: '17s', delay: '-14s', size: '3px', opacity: 0.4 },
  { id: 14, left: '66%', dur: '23s', delay: '-7s', size: '3px', opacity: 0.5 }
];

const ParticulasFondoDemo = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" style={{ transform: 'translateZ(0)' }}>
    {PARTICULAS_TV.map((p) => (
      <div
        key={p.id}
        className="absolute bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
        style={{
          left: p.left,
          width: p.size,
          height: p.size,
          bottom: '-10px',
          opacity: p.opacity,
          animation: `floatUpDemo ${p.dur} linear infinite`,
          animationDelay: p.delay
        }}
      />
    ))}
    <style>{`
      @keyframes floatUpDemo {
        0% { transform: translateY(0) scale(0.5); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateY(-450px) scale(1.4); opacity: 0; }
      }
    `}</style>
  </div>
);

export default function LandingPage() {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState('live');
  const [activeFaq, setActiveFaq] = useState(null);
  const [likedTinder, setLikedTinder] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState(0);
  const [tvIndex, setTvIndex] = useState(0);
  const [tvIniciada, setTvIniciada] = useState(false);
  const [tvListo, setTvListo] = useState(false);
  const demoVideoRef = useRef(null);

  const tvDemoItems = [
    { id: 1, tipo: 'imagen', url: '/demo1.png', likes: 24, comentarios: 5 },
    { id: 2, tipo: 'imagen', url: '/demo2.png', likes: 38, comentarios: 9 },
    { id: 3, tipo: 'video', url: '/demo3.mp4', likes: 52, comentarios: 14 },
    { id: 4, tipo: 'imagen', url: '/demo4.jpeg', likes: 31, comentarios: 7 }
  ];

  const currentTvItem = tvDemoItems[tvIndex];

  const nextTvSlide = () => {
    setTvIndex((prev) => (prev + 1) % tvDemoItems.length);
  };

  const iniciarDemoTV = () => {
    setTvIndex(0);
    setTvIniciada(true);
  };

  // Precarga silenciosa de las imágenes apenas abre la página
  useEffect(() => {
    let cargadas = 0;
    const imagenes = ['/demo1.png', '/demo2.png', '/demo4.jpeg'];
    imagenes.forEach((src) => {
      const img = new window.Image();
      img.src = src;
      img.onload = img.onerror = () => {
        cargadas += 1;
        if (cargadas === imagenes.length) {
          setTvListo(true);
        }
      };
    });
    const fallback = setTimeout(() => setTvListo(true), 2000);
    return () => clearTimeout(fallback);
  }, []);

  // Control del temporizador y reproducción instantánea del video ya cargado
  useEffect(() => {
    if (activeTab !== 'live' || !tvIniciada) {
      if (demoVideoRef.current) demoVideoRef.current.pause();
      return;
    }

    if (currentTvItem.tipo === 'video' && demoVideoRef.current) {
      demoVideoRef.current.currentTime = 0;
      demoVideoRef.current.play().catch(() => {});
    } else if (demoVideoRef.current) {
      demoVideoRef.current.pause();
    }

    const tiempoLimite = currentTvItem.tipo === 'video' ? 20000 : 4000;
    const timer = setTimeout(() => {
      nextTvSlide();
    }, tiempoLimite);

    return () => clearTimeout(timer);
  }, [tvIndex, activeTab, tvIniciada, currentTvItem.tipo]);
  
const [retoFase, setRetoFase] = useState('idle'); // 'idle' | 'countdown' | 'revealed'
  const [retoCount, setRetoCount] = useState(3);

  // Challenges generator
  const challenges = [
    "tirar los pasos prohibidos con un amigo.",
    "Shot con los novios.",
    "cual es la mesa mas divertida de la fiesta.",
    "encuentra la persona con mas Aura de la noche.",
    "Foto con un pelado."
  ];

  const iniciarJuegoReto = () => {
    setRetoCount(3);
    setRetoFase('countdown');
  };

  const siguienteRetoJuego = () => {
    setCurrentChallenge((prev) => (prev + 1) % challenges.length);
    setRetoCount(3);
    setRetoFase('countdown');
  };

  useEffect(() => {
    if (activeTab !== 'retos') {
      setRetoFase('idle');
      return;
    }
    if (retoFase !== 'countdown') return;

    const timer = setTimeout(() => {
      if (retoCount > 1) {
        setRetoCount((prev) => prev - 1);
      } else {
        setRetoFase('revealed');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [retoFase, retoCount, activeTab]);
  
  const handleTinderLike = () => {
    setLikedTinder(true);
    setTimeout(() => {
      setShowMatch(true);
    }, 400);
  };

  const resetTinder = () => {
    setLikedTinder(false);
    setShowMatch(false);
  };

  const faqs = [
    {
      q: "¿Los invitados necesitan descargar alguna aplicación?",
      a: "¡Para nada! Event-Dump abre 100% en el navegador web del teléfono. Los invitados solo apuntan con la cámara del celular al código QR impreso en las mesas o cartelera y entran al instante sin crear cuenta ni instalar nada."
    },
    {
      q: "¿Cómo transmito las fotos en vivo a la pantalla gigante o proyector?",
      a: "Es extremadamente sencillo. Te daremos un link único de 'Modo TV'. Solo abres ese link en la laptop conectada al proyector, TV o pantalla LED del local. Las fotos irán apareciendo automáticamente con una animación en vivo impecable."
    },
    {
      q: "¿Puedo moderar o borrar fotos si alguien sube algo desubicado?",
      a: "Por supuesto. El anfitrión o el DJ tienen un panel de control rápido en tiempo real para ocultar o borrar cualquier foto con un solo toque antes o durante la transmisión."
    },
    {
      q: "¿Cómo funciona el BlinkCrush interno en el evento?",
      a: "Los invitados que lo deseen activan su perfil en 5 segundos con un apodo y una selfie. Deslizan perfiles de los demás invitados de la fiesta. Si dos personas se dan 'Like' mutuamente, reciben una notificación de MATCH instantánea para ir a buscarse en la barra."
    },
    {
      q: "¿Cómo recibo las fotos al terminar el evento?",
      a: "Al finalizar la fiesta, el anfitrión puede descargar todo el lote ('Dump') de fotos y videos con un solo clic en un archivo ZIP ordenado."
    },
    {
      q: "¿Cómo realizo el pago en Paraguay?",
      a: "Aceptamos Giros Tigo, transferencias bancarias (SIPAP), Pix o tarjetas de crédito/débito. Recibes la confirmación e inicio de tu álbum al instante."
    }
  ];

  return (
    <div className="min-h-screen bg-[#0B0D19] text-slate-100 font-sans selection:bg-pink-500 selection:text-white antialiased overflow-x-hidden">
      <Head>
        <title>Event-Dump | Álbum de fotos compartido por QR en Paraguay</title>
        <meta name="description" content="Tus invitados escanean el QR y comparten fotos y videos de tu boda, cumpleaños o evento en tiempo real. Sin descargar apps." />
        <meta name="google" content="notranslate" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      {/* GLOW BACKGROUND EFFECTS */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-pink-600/15 via-purple-600/15 to-orange-500/15 blur-[140px] pointer-events-none -z-10 rounded-full" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-pink-600/10 blur-[160px] pointer-events-none -z-10 rounded-full" />

      {/* TOP NOTIFICATION BAR */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-pink-950 text-slate-200 text-xs md:text-sm py-2.5 px-4 text-center font-medium border-b border-pink-500/20 flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1 bg-pink-500/20 text-pink-400 border border-pink-500/30 px-2 py-0.5 rounded-full text-xs font-bold animate-pulse">
          <Sparkles className="w-3 h-3 text-pink-400" /> ¿Qué pasó ayer?
        </span>
        <span>Lo mejor de la noche, que lo vivan todos!! <strong> </strong>- Retos - interacciones - trasmisión en Pantalla.</span>
      </div>

      {/* HEADER / NAVIGATION */}
      <header className="sticky top-0 z-40 bg-[#0B0D19]/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* LOGO */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-600 to-orange-400 p-0.5 shadow-lg shadow-pink-500/20">
              <div className="w-full h-full bg-[#0B0D19] rounded-[10px] flex items-center justify-center">
                <Camera className="w-5 h-5 text-pink-400" />
              </div>
            </div>
            <div className="flex flex-col notranslate" translate="no">
              <span className="font-extrabold text-xl tracking-tight text-white leading-none">
                event<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-400">-dump</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Álbum & Match de Fiesta</span>
            </div>
          </div>

          {/* NAV LINKS */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <a href="#experiencia" className="hover:text-pink-400 transition-colors">¿Cómo Funciona?</a>
            <a href="#funciones" className="hover:text-pink-400 transition-colors">Las 4 Funciones</a>
            <a href="#lqnsp" className="hover:text-pink-400 transition-colors">Concepto LQNSP</a>
            <a href="#precio" className="hover:text-pink-400 transition-colors">Precio</a>
            <a href="#faq" className="hover:text-pink-400 transition-colors">FAQ</a>
            <button 
              onClick={() => router.push('/app')}
              className="hover:text-pink-400 transition-colors"
            >
              Iniciar Sesión
            </button>
          </nav>

          {/* CTA BUTTON */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/crear')}
              className="bg-gradient-to-r from-pink-500 via-purple-600 to-orange-500 hover:opacity-95 text-white px-5 py-2.5 rounded-full text-sm font-extrabold shadow-lg shadow-pink-500/25 transition-all hover:scale-105 active:scale-95"
            >
              Crear Álbum
            </button>
          </div>

        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          
          {/* Badge LQNSP */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs md:text-sm font-bold mb-6 backdrop-blur-md">
            <Flame className="w-4 h-4 text-orange-400 fill-orange-400 animate-bounce" />
            <span>#LQNSP — Las Que No Se Publican</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.08] mb-6">
            Las mejores fotos de tu fiesta <br className="hidden sm:inline"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-orange-400">
              no tienen filtro ni pose.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-slate-300 font-normal leading-relaxed max-w-3xl mx-auto mb-10">
            Escaneo QR en la mesa sin bajar apps. Fotos en vivo en la pantalla gigante, juegos de retos y un <strong className="text-white font-semibold">BlinkCrush</strong> interno, solo de tu fiesta.
          </p>

          {/* CTA Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <button 
              onClick={() => router.push('/crear')}
              className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-600 to-orange-500 hover:brightness-110 text-white font-extrabold px-8 py-4 rounded-2xl text-lg transition-all shadow-xl shadow-pink-500/30 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 group"
            >
              <Zap className="w-5 h-5 fill-current text-amber-300" />
              <span>Crear Álbum</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button 
              onClick={() => router.push('/app')}
              className="w-full sm:w-auto bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-bold px-7 py-4 rounded-2xl text-base border border-slate-700/80 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 text-pink-400 fill-pink-400" />
              <span>Entrar a mi cuenta</span>
            </button>
          </div>

          {/* Mini Trust Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto pt-6 border-t border-slate-800/80 text-xs md:text-sm font-semibold text-slate-400">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-pink-400" />
              <span>0% Descargas de Apps</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-orange-400" />
              <span>Transmisión TV en Vivo</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
              <span>Match Secreto entre Invitados</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Descargas ilimitadas</span>
            </div>
          </div>

        </div>
      </section>

      {/* METRICS & NUMBERS */}
      <section className="py-10 bg-slate-900/60 border-y border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4">
              <p className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">+500</p>
              <p className="text-xs md:text-sm text-slate-400 mt-1 font-medium">Fiestas, Cumples & Bodas</p>
            </div>
            <div className="p-4">
              <p className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400">100%</p>
              <p className="text-xs md:text-sm text-slate-400 mt-1 font-medium">Diversión / Conexión</p>
            </div>
            <div className="p-4">
              <p className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">fácil</p>
              <p className="text-xs md:text-sm text-slate-400 mt-1 font-medium">hasta para la abuela</p>
            </div>
            <div className="p-4">
              <p className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">Priv</p>
              <p className="text-xs md:text-sm text-slate-400 mt-1 font-medium">uso Exclusivo de tu evento</p>
            </div>
          </div>
        </div>
      </section>

      {/* THE PROBLEM vs THE EVENT-DUMP EXPERIENCE */}
      <section id="experiencia" className="py-24 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-pink-400 mb-2">La Realidad de las Fiestas</h2>
            <p className="text-3xl md:text-4xl font-extrabold text-white">
              Sacaron 800 fotos... pero solo vas a ver 5 en Instagram.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            
            {/* The Old Boring Way */}
            <div className="bg-slate-900/80 p-8 rounded-3xl border border-red-500/20 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-red-500/60" />
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center font-bold">
                    ✕
                  </div>
                  <h3 className="text-xl font-bold text-white">Como siempre se hizo (Aburrido)</h3>
                </div>

                <ul className="space-y-4 text-slate-300 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 font-bold">✕</span>
                    <span><strong>Pedir fotos por WhatsApp al día siguiente:</strong> El 80% de tus invitados se olvida de enviártelas.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 font-bold">✕</span>
                    <span><strong>Fotos posadas y falsas:</strong> Solo la foto oficial de la mesa donde todos están serios. Se pierde la magia real de la pista.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 font-bold">✕</span>
                    <span><strong>Sin interacción en el evento:</strong> Los invitados están en sus mesas mirando sus propios teléfonos de forma individual.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-800 text-xs text-red-400 font-semibold">
                Resultado: Las mejores anécdotas de la noche quedan guardadas para siempre en celulares ajenos.
              </div>
            </div>

            {/* The Event-Dump Way */}
            <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-purple-950/60 p-8 rounded-3xl border border-pink-500/40 shadow-2xl shadow-pink-500/10 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-orange-400" />
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/40 text-pink-400 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Con Event-Dump (Fiesta Épica)</h3>
                </div>

                <ul className="space-y-4 text-slate-200 text-sm">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
                    <span><strong>QR en las Mesas:</strong> Escanean y suben fotos en 3 segundos. Sin registrarse, sin bajar ninguna app.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                    <span><strong>Proyección TV en Vivo:</strong> La pantalla gigante proyecta las fotos en tiempo real. ¡Todo el mundo mira y se ríe!</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                    <span><strong>Macht Interno + Retos:</strong> Los invitados juegan a desafíos y hacen BC secreto durante la noche.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-800 text-xs text-pink-400 font-extrabold flex items-center gap-2">
                <PartyPopper className="w-4 h-4 text-orange-400" />
                <span>Resultado: Recuerdos reales, descontrol sano y una fiesta inolvidable.</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* THE 4 PILLARS & INTERACTIVE DEMO */}
      <section id="funciones" className="py-24 bg-slate-900/80 border-t border-slate-800 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2 block">Experiencia 4 en 1</span>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Todo lo que pasa en tu fiesta, en una sola app.
            </h2>
            <p className="text-slate-400 text-base mt-4">
              Prueba la demo interactiva a continuación para ver cómo tus invitados interactuarán durante la noche.
            </p>
          </div>

          {/* INTERACTIVE DEMO TABS */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <button
              onClick={() => setActiveTab('live')}
              className={`px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all ${
                activeTab === 'live' 
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25 scale-105' 
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>1. Live Stream TV</span>
            </button>

            <button
              onClick={() => setActiveTab('tinder')}
              className={`px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all ${
                activeTab === 'tinder' 
                  ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white shadow-lg shadow-pink-500/25 scale-105' 
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Heart className="w-4 h-4" />
              <span>2. BlinkCrush (Match)</span>
            </button>

            <button
              onClick={() => setActiveTab('retos')}
              className={`px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all ${
                activeTab === 'retos' 
                  ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-lg shadow-orange-500/25 scale-105' 
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>3. Juegos & Retos</span>
            </button>

            <button
              onClick={() => setActiveTab('qr')}
              className={`px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all ${
                activeTab === 'qr' 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/25 scale-105' 
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>4. QR en Mesas</span>
            </button>
          </div>

          {/* DEMO DISPLAY DISPLAY BOX */}
          <div className="bg-[#0B0D19] border border-slate-700/80 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
            
{/* 1. LIVE STREAM DEMO */}
            {activeTab === 'live' && (
              <div className="grid md:grid-cols-3 gap-8 items-center animate-in fade-in duration-300">
                <div className="md:col-span-2 flex flex-col gap-2.5">
                  
                  {/* Marco Superior TV */}
                  <div className="flex items-center justify-between px-1 text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${tvIniciada ? 'bg-red-500 animate-ping' : 'bg-blue-400'}`} />
                      <strong className="text-white">EVENT-DUMP LIVE TV</strong>
                    </span>
                    {tvIniciada && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={nextTvSlide}
                          className="bg-slate-800/90 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-sans font-bold tracking-wider uppercase transition-colors"
                        >
                          Siguiente ⏭
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Pantalla Gigante Real 16:9 */}
                  <div className="relative w-full aspect-video bg-black rounded-2xl border border-slate-800 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] select-none">
                    
                    {/* LOBBY IDÉNTICO A PANTALLA.JS ANTES DE INICIAR */}
                    {!tvIniciada && (
                      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-900 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800 to-black text-white p-4">
                        <h4 className="text-2xl sm:text-4xl font-black mb-5 sm:mb-7 tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-2xl">
                          Social Wall
                        </h4>

                        {!tvListo ? (
                          <div className="flex flex-col items-center gap-3 animate-pulse">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs sm:text-sm font-medium tracking-wider text-zinc-300">
                              Preparando motor gráfico y caché...
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={iniciarDemoTV}
                            className="group relative px-6 py-3 sm:px-8 sm:py-4 bg-blue-600 rounded-full font-bold text-sm sm:text-lg tracking-widest uppercase shadow-[0_0_35px_rgba(37,99,235,0.65)] hover:scale-105 hover:bg-blue-500 transition-all duration-300 overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                            <span className="relative flex items-center gap-2">
                              ▶ Iniciar Transmisión
                            </span>
                          </button>
                        )}

                        <p className="absolute bottom-3 text-zinc-500 text-[10px] sm:text-xs tracking-widest uppercase">
                          {tvDemoItems.length} publicaciones listas
                        </p>
                      </div>
                    )}

                    {/* PARTÍCULAS Y DIAPOSITIVAS YA MONTADAS EN MEMORIA (0ms LAG) */}
                    <ParticulasFondoDemo />

                    {tvDemoItems.map((item, idx) => {
                      const esActual = tvIniciada && idx === tvIndex;
                      return (
                        <div
                          key={`tv-slide-${item.id}`}
                          className={`absolute inset-0 w-full h-full flex items-center justify-center p-4 sm:p-7 transition-all duration-500 ${
                            esActual
                              ? 'opacity-100 scale-100 z-10'
                              : 'opacity-0 scale-95 z-0 pointer-events-none'
                          }`}
                          style={{ transform: 'translateZ(0)' }}
                        >
                          {item.tipo === 'video' ? (
                            <video
                              ref={demoVideoRef}
                              src={item.url}
                              muted
                              playsInline
                              preload="auto"
                              onCanPlayThrough={() => setTvListo(true)}
                              onEnded={nextTvSlide}
                              onError={nextTvSlide}
                              className="w-full h-full object-contain drop-shadow-[0_15px_35px_rgba(0,0,0,0.85)] rounded-xl sm:rounded-2xl border border-white/10"
                            />
                          ) : (
                            <img
                              src={item.url}
                              alt="Transmisión en vivo Event-Dump"
                              className="w-full h-full object-contain drop-shadow-[0_15px_35px_rgba(0,0,0,0.85)] rounded-xl sm:rounded-2xl border border-white/10"
                            />
                          )}
                        </div>
                      );
                    })}

                    {/* OVERLAYS DE TRANSMISIÓN ACTIVA */}
                    {tvIniciada && (
                      <>
                        {/* Cartel QR Flotante (Abajo Izquierda) */}
                        <div className="hidden sm:flex absolute bottom-3 left-3 z-20 bg-white p-2 rounded-2xl shadow-2xl flex-col items-center gap-1">
                          <QrCode className="w-10 h-10 md:w-12 md:h-12 text-black" />
                          <p className="text-black font-black uppercase tracking-wider text-center text-[7px] leading-tight">
                            ESCANEA PARA<br />
                            <span className="text-blue-600">SUBIR FOTOS</span>
                          </p>
                        </div>

                        {/* Cápsula de Comentarios y Likes (Abajo Derecha) */}
                        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2.5 bg-black/50 backdrop-blur-xl px-3.5 py-1.5 rounded-full border border-white/15 shadow-xl">
                          <div className="flex items-center gap-1.5">
                            <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/90" />
                            <span className="text-white font-bold text-xs sm:text-sm">{currentTvItem.comentarios}</span>
                          </div>
                          <div className="w-px h-3.5 bg-white/20" />
                          <div className="flex items-center gap-1.5">
                            <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500 fill-red-500" />
                            <span className="text-white font-bold text-xs sm:text-sm">{currentTvItem.likes}</span>
                          </div>
                        </div>

                        {/* Indicadores de progreso abajo al centro */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                          {tvDemoItems.map((item, idx) => (
                            <button
                              key={item.id}
                              onClick={() => setTvIndex(idx)}
                              aria-label={`Ver diapositiva ${idx + 1}`}
                              className={`h-1 rounded-full transition-all ${
                                idx === tvIndex ? 'w-5 bg-pink-500' : 'w-1.5 bg-white/30 hover:bg-white/60'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-white">Transmisión en Vivo a la Pantalla del Evento</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Conecta una laptop al proyector o TV del local. Cada foto o video que suban los invitados aparecerá al instante con un diseño moderno de fiesta.
                  </p>
                  <ul className="space-y-2 text-xs font-semibold text-slate-300">
                    <li className="flex items-center gap-2 text-pink-400">
                      <CheckCircle2 className="w-4 h-4" /> Moderación en tiempo real por el anfitrión
                    </li>
                    <li className="flex items-center gap-2 text-pink-400">
                      <CheckCircle2 className="w-4 h-4" /> Código QR integrado en pantalla
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* 2. TINDER INTERNO DEMO */}
            {activeTab === 'tinder' && (
              <div className="grid md:grid-cols-2 gap-8 items-center animate-in fade-in duration-300">
                <div className="max-w-sm mx-auto w-full bg-slate-950 p-6 rounded-3xl border border-pink-500/30 shadow-xl relative text-center">
                  
                  {!showMatch ? (
                    <div>
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 to-orange-400 p-1 mx-auto mb-3 shadow-lg">
                        <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center font-bold text-xl text-white">
                          C
                        </div>
                      </div>

                      <h4 className="text-lg font-extrabold text-white">Camila, 24</h4>
                      <p className="text-xs text-pink-400 mb-4 font-semibold">Mesa 8 — "Tomando Fernet en la barra 🍹"</p>

                      <div className="p-3 bg-slate-900 rounded-xl text-xs text-slate-400 mb-6">
                        ¿Le das Like secreto? Si ella también te da Like, les avisamos a ambos para ir a charlar.
                      </div>

                      <div className="flex items-center justify-center gap-4">
                        <button 
                          onClick={resetTinder}
                          className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 text-slate-400 flex items-center justify-center hover:bg-slate-800"
                        >
                          ✕
                        </button>
                        <button 
                          onClick={handleTinderLike}
                          className={`w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-pink-500/30 hover:scale-110 transition-transform ${likedTinder ? 'scale-110' : ''}`}
                        >
                          <Heart className="w-7 h-7 fill-current" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 animate-in zoom-in-95 duration-200">
                      <div className="w-16 h-16 bg-pink-500/20 text-pink-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-pink-500/40 animate-bounce">
                        <Heart className="w-8 h-8 fill-current" />
                      </div>
                      <h4 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400 mb-1">
                        ¡IT'S A MATCH! 🔥
                      </h4>
                      <p className="text-xs text-slate-300 mb-6">
                        A Camila también le gustaste. ¡Buscala en la <strong>Mesa 8</strong> o en la barra!
                      </p>
                      <button 
                        onClick={resetTinder}
                        className="text-xs text-slate-400 underline hover:text-white"
                      >
                        Probar de nuevo
                      </button>
                    </div>
                  )}

                </div>

                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-400 text-xs font-bold">
                    <Heart className="w-3.5 h-3.5 fill-current" /> Exclusivo para la Fiesta
                  </div>
                  <h3 className="text-2xl font-bold text-white">Match Secreto entre Invitados (Tinder de la Fiesta)</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Rompe el hielo entre los solteros y amigos del evento. Los invitados activan su perfil opcionalmente. Nadie ve a quién le diste Like... a menos que sea mutuo.
                  </p>
                  <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs text-slate-300">
                    🔒 <strong>100% Privado:</strong> Solo funciona dentro de la duración del evento. Sin chats ni datos personales expuestos.
                  </div>
                </div>
              </div>
            )}

   {/* 3. RETOS & JUEGOS DEMO */}
            {activeTab === 'retos' && (
              <div className="grid md:grid-cols-2 gap-8 items-center animate-in fade-in duration-300">
                
                {/* PANTALLA INTERACTIVA DE RETOS */}
                <div
                  className={`min-h-[290px] sm:min-h-[320px] p-6 sm:p-8 rounded-3xl border shadow-2xl flex flex-col items-center justify-center text-center transition-colors duration-300 select-none ${
                    retoFase === 'revealed'
                      ? 'bg-white border-white text-black'
                      : 'bg-black border-slate-800 text-white'
                  }`}
                >
                  {/* ESTADO 1: SOLO BOTÓN JUGAR */}
                  {retoFase === 'idle' && (
                    <button
                      onClick={iniciarJuegoReto}
                      className="bg-gradient-to-r from-orange-500 to-pink-500 hover:brightness-110 text-white font-black text-xl sm:text-2xl uppercase tracking-wider px-10 py-5 rounded-2xl shadow-xl shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                    >
                      <Play className="w-6 h-6 fill-current" />
                      <span>Jugar</span>
                    </button>
                  )}

                  {/* ESTADO 2: CONTADOR 3, 2, 1 EN FONDO NEGRO */}
                  {retoFase === 'countdown' && (
                    <div
                      key={`count-${retoCount}`}
                      className="flex items-center justify-center animate-in zoom-in-75 duration-200"
                    >
                      <span className="text-8xl sm:text-9xl font-black text-white tracking-tighter">
                        {retoCount}
                      </span>
                    </div>
                  )}

                  {/* ESTADO 3: RETO GRANDE FONDO BLANCO + LETRA NEGRA + BOTÓN SIGUIENTE RETO */}
                  {retoFase === 'revealed' && (
                    <div className="w-full h-full flex flex-col justify-between items-center gap-6 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex-1 flex items-center justify-center px-2">
                        <p className="text-2xl sm:text-3xl font-black text-black leading-snug">
                          {challenges[currentChallenge]}
                        </p>
                      </div>

                      <button
                        onClick={siguienteRetoJuego}
                        className="w-full bg-black hover:bg-zinc-800 text-white font-extrabold text-sm sm:text-base uppercase tracking-wider py-4 px-6 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <RotateCw className="w-4 h-4" />
                        <span>Siguiente Reto</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* DESCRIPCIÓN DERECHA */}
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-white">Juegos & Retos interactivos</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Mantén a la gente activa durante toda la noche con desafíos divertidos. Los invitados suben la foto cumpliendo el reto y compiten en la tabla de posiciones en vivo.
                  </p>
                </div>

              </div>
            )}

            {/* 4. QR EN MESAS DEMO */}
            {activeTab === 'qr' && (
              <div className="grid md:grid-cols-2 gap-8 items-center animate-in fade-in duration-300">
                <div className="bg-slate-950 p-8 rounded-3xl border border-purple-500/30 text-center shadow-xl max-w-sm mx-auto w-full">
                  <div className="bg-white p-4 rounded-2xl inline-block shadow-lg mb-4">
                    <QrCode className="w-32 h-32 text-slate-900" />
                  </div>
                  <h4 className="text-lg font-extrabold text-white">¡ESCANEA Y SUBE TU FOTO!</h4>
                  <p className="text-xs text-purple-400 mt-1">Sin contraseñas • Sin descargar nada</p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-white">QR Imprimibles Listos para las Mesas</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Te entregamos archivos PDF listos en alta resolución para imprimir carteles en las mesas, la barra o la entrada del salón.
                  </p>
                </div>
              </div>
            )}

          </div>

        </div>
      </section>

      {/* LQNSP CONCEPT SECTION */}
      <section id="lqnsp" className="py-24 bg-[#0B0D19] relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-pink-950/80 p-8 md:p-14 rounded-3xl border border-pink-500/30 relative shadow-2xl">
            <div className="max-w-3xl">
              <span className="text-xs font-bold text-pink-400 uppercase tracking-widest block mb-2">El manifiesto de la fiesta</span>
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-6">
                LQNSP: <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">Las Que No Se Publican.</span>
              </h2>
              
              <div className="space-y-4 text-slate-300 text-sm md:text-base leading-relaxed">
                <p>
                  Instagram es para la pose perfecta. <strong>Event-Dump es para la noche real.</strong>
                </p>
                <p>
                  La foto con la boca llena, el amigo que se quedó dormido en la silla, el baile desenfrenado de las 4:00 AM y las risas con los ojos cerrados. Acá la "basura" es el recuerdo más valioso que vas a guardar.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-4 text-xs font-bold text-pink-300">
                <span className="px-3 py-1.5 rounded-lg bg-pink-500/20 border border-pink-500/30">#SinFiltros</span>
                <span className="px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30">#0Poses</span>
                <span className="px-3 py-1.5 rounded-lg bg-orange-500/20 border border-orange-500/30">#MomentosReales</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* PRICING CARD SECTION (330.000 Gs) */}
      <section id="precio" className="py-24 bg-[#0B0D19] relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-pink-400 mb-2">Precio Transparente</h2>
            <p className="text-3xl md:text-5xl font-black text-white">
              Un solo pago. Cero sorpresas.
            </p>
          </div>

          <div className="max-w-md mx-auto bg-gradient-to-b from-slate-900 to-purple-950 p-8 md:p-10 rounded-3xl border-2 border-pink-500/50 shadow-2xl shadow-pink-500/20 relative">
            
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-orange-500 text-white text-xs font-black uppercase px-4 py-1.5 rounded-full shadow-md">
              Pase Completo por Evento
            </div>

            <div className="text-center my-6">
              <h3 className="text-2xl font-extrabold text-white mb-1">Pase 1 Evento</h3>
              <p className="text-xs text-slate-400">Ideal para Bodas, Cumples, XV y Fiestas Privadas</p>
              
              <div className="mt-6 mb-4">
                <span className="text-5xl font-black text-white tracking-tight">330.000</span>
                <span className="text-lg font-bold text-pink-400 ml-1">Gs</span>
              </div>
              <p className="text-xs text-emerald-400 font-semibold">✓ Pago único — Acceso completo</p>
            </div>

            <ul className="space-y-3 text-sm text-slate-200 mb-8 border-t border-b border-slate-800 py-6">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-pink-400 shrink-0" />
                <span><strong>Fotos & Videos ilimitados</strong> sin compresión</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-pink-400 shrink-0" />
                <span><strong>Códigos QR imprimibles</strong> para las mesas</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-pink-400 shrink-0" />
                <span><strong>Proyección Live TV</strong> para pantalla gigante</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-pink-400 shrink-0" />
                <span><strong>Tinder Interno</strong> (Match secreto entre invitados)</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-pink-400 shrink-0" />
                <span><strong>Juegos de Retos</strong> en vivo para la fiesta</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-pink-400 shrink-0" />
                <span><strong>Descarga ZIP HD</strong> de todas las fotos post-evento</span>
              </li>
            </ul>

            <button 
              onClick={() => router.push('/crear')}
              className="w-full bg-gradient-to-r from-pink-500 via-purple-600 to-orange-500 hover:brightness-110 text-white font-black py-4 px-6 rounded-2xl text-lg shadow-xl shadow-pink-500/30 transition-all hover:scale-105 active:scale-95"
            >
              Crear Mi Álbum Ahora
            </button>

            <p className="text-[11px] text-center text-slate-400 mt-4">
              ¿Eres dueño de boliche o salón de eventos? <br/>
              <a href="https://wa.me/595900000000" target="_blank" className="text-pink-400 font-bold underline">Consulta planes mensuales especiales</a>
            </p>

          </div>

        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-24 bg-[#0B0D19]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-white">Preguntas Frecuentes</h2>
            <p className="text-slate-400 text-sm mt-2">Respuestas rápidas para organizar tu evento.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/80 transition-all"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full text-left p-5 font-bold text-white flex items-center justify-between gap-4"
                >
                  <span className="text-base">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-pink-400 transition-transform duration-200 shrink-0 ${activeFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                {activeFaq === idx && (
                  <div className="p-5 pt-0 text-slate-300 text-sm leading-relaxed border-t border-slate-900">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="py-20 bg-gradient-to-t from-purple-950 via-slate-950 to-slate-950 border-t border-slate-800 relative text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
            No dejes que los mejores recuerdos de tu fiesta se pierdan.
          </h2>
          <p className="text-slate-300 text-base max-w-xl mx-auto mb-8">
            Crea tu evento en 2 minutos y recibe los códigos QR listos para imprimir hoy mismo.
          </p>

          <button 
            onClick={() => router.push('/crear')}
            className="bg-gradient-to-r from-pink-500 via-purple-600 to-orange-500 hover:brightness-110 text-white font-extrabold px-10 py-4 rounded-2xl text-lg shadow-xl shadow-pink-500/30 transition-all hover:scale-105 active:scale-95"
          >
            Crear Álbum — 330.000 Gs
          </button>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 bg-slate-950 text-slate-500 text-xs border-t border-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-white">
            <Camera className="w-4 h-4 text-pink-400" />
            <span>Event-Dump Paraguay</span>
          </div>
          <p>© {new Date().getFullYear()} Event-Dump Inc. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-300">Términos</a>
            <a href="#" className="hover:text-slate-300">Privacidad</a>
            <a href="https://wa.me/595900000000" target="_blank" rel="noreferrer" className="hover:text-slate-300">WhatsApp Soporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
