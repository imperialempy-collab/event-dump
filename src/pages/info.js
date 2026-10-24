import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';

export default function QueEsEventDump() {
  const router = useRouter();
  const containerRef = useRef(null);

  // Recreamos el pequeño script JS del HTML original para dibujar las polaroids en SVG
  useEffect(() => {
    if (!containerRef.current) return;
    
    var P = function(x, c, arms, s) {
      s = s || 1;
      return '<g transform="translate(' + x + ' 168) scale(' + s + ')">' + 
             (arms ? '<path d="M-16 -30L-32 -62M16 -30L32 -62" stroke="' + c + '" stroke-width="9" stroke-linecap="round"/>' : '') + 
             '<circle cy="-56" r="13" fill="#F2B995"/><path d="M-19 0v-30a19 19 0 0 1 38 0v30z" fill="' + c + '"/></g>';
    };
    var W = function(b) {
      return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">' + b + '</svg>';
    };
    var bulbs = function() {
      var s = '<path d="M-5 40Q100 90 205 40" stroke="#333" fill="none" stroke-width="1.5"/>';
      [20, 50, 80, 110, 140, 170].forEach(function(x) {
        var y = 40 + Math.sin((x + 5) / 210 * Math.PI) * 34;
        s += '<circle cx="' + x + '" cy="' + (y + 7) + '" r="10" fill="#FFB22E" opacity=".25"/><circle cx="' + x + '" cy="' + (y + 7) + '" r="5" fill="#FFD66B"/>';
      });
      return s;
    };
    var S = {
      lights: W('<defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B2D6E"/><stop offset="1" stop-color="#FF8A5B"/></linearGradient></defs><rect width="200" height="200" fill="url(#g1)"/>' + bulbs() + '<rect y="168" width="200" height="32" fill="#2a2440"/>' + P(78, '#FF4F81') + P(122, '#F4F1FF')),
      cake: W('<rect width="200" height="200" fill="#FFD3E0"/><rect y="150" width="200" height="50" fill="#FF9DB9"/><rect x="55" y="115" width="90" height="38" rx="6" fill="#fff"/><rect x="70" y="85" width="60" height="32" rx="6" fill="#FF4F81"/><path d="M55 125q11 12 22 0t22 0 22 0 22 0" fill="#FF4F81"/><g stroke="#2F6BFF" stroke-width="4"><path d="M85 85v-18M100 85v-22M115 85v-18"/></g><g fill="#FFB22E"><circle cx="85" cy="62" r="6"/><circle cx="100" cy="57" r="6"/><circle cx="115" cy="62" r="6"/></g><circle cx="30" cy="40" r="5" fill="#2F6BFF"/><circle cx="170" cy="55" r="6" fill="#FFB22E"/><circle cx="150" cy="25" r="4" fill="#fff"/>'),
      toast: W('<rect width="200" height="200" fill="#1B2150"/><g fill="#FFB22E"><circle cx="30" cy="40" r="22" opacity=".25"/><circle cx="165" cy="60" r="30" opacity=".2"/><circle cx="140" cy="150" r="18" opacity=".25"/><circle cx="50" cy="150" r="14" opacity=".3"/></g><g transform="rotate(-18 85 130)"><path d="M65 70h40l-7 55a13 13 0 0 1-26 0z" fill="#FFD66B" opacity=".9"/><path d="M85 130v38M70 168h30" stroke="#fff" stroke-width="4"/></g><g transform="rotate(18 118 130)"><path d="M98 70h40l-7 55a13 13 0 0 1-26 0z" fill="#FF8AAE" opacity=".9"/><path d="M118 130v38M103 168h30" stroke="#fff" stroke-width="4"/></g><g fill="#fff"><circle cx="102" cy="48" r="3"/><circle cx="90" cy="38" r="2"/><circle cx="114" cy="36" r="2"/></g>'),
      dance: W('<defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5B2A86"/><stop offset="1" stop-color="#FF4F81"/></linearGradient></defs><rect width="200" height="200" fill="url(#g2)"/><g fill="#fff"><circle cx="40" cy="35" r="16" opacity=".2"/><circle cx="160" cy="30" r="22" opacity=".15"/><circle cx="110" cy="55" r="10" opacity=".25"/></g>' + P(55, '#FFB22E', 1, .95) + P(105, '#2F6BFF', 1, 1.1) + P(152, '#fff', 1, .9)),
      trip: W('<defs><linearGradient id="g3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB22E"/><stop offset="1" stop-color="#FF6F91"/></linearGradient></defs><rect width="200" height="200" fill="url(#g3)"/><circle cx="130" cy="100" r="34" fill="#FFF3C4"/><path d="M0 130q50-40 100-5t100-20v95H0z" fill="#7A3E83"/><path d="M0 160q60-25 120-5t80-5v50H0z" fill="#3C2358"/><rect x="60" y="150" width="62" height="20" rx="8" fill="#fff"/><path d="M72 150l10-14h26l10 14z" fill="#fff"/><circle cx="76" cy="171" r="7" fill="#161A33"/><circle cx="108" cy="171" r="7" fill="#161A33"/>')
    };

    const elements = containerRef.current.querySelectorAll('[data-s]');
    elements.forEach(function(el) {
      el.innerHTML = S[el.dataset.s];
    });
  }, []);

  return (
    <>
      <Head>
        <title>¿Qué es Event-Dump?</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* Etiqueta para bloquear el traductor de Google */}
        <meta name="google" content="notranslate" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&family=Manrope:wght@400;600;800&family=Caveat:wght@600&display=swap" rel="stylesheet" />
      </Head>

      <style dangerouslySetInnerHTML={{__html: `
        :root{--bg:#F6F7FB;--ink:#161A33;--muted:#5E6382;--card:#fff;--amber:#FFB22E;--pink:#FF4F81;--blue:#2F6BFF;--night:#14173A;
        box-sizing:border-box;}
        @media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0F1226;--ink:#F2F3FA;--muted:#A3A8C8;--card:#1A1E3A}}
        :root[data-theme="dark"]{--bg:#0F1226;--ink:#F2F3FA;--muted:#A3A8C8;--card:#1A1E3A}
        .event-dump-info-page *{box-sizing:border-box;margin:0}
        .event-dump-info-page {background:var(--bg);color:var(--ink);font-family:Manrope,system-ui,sans-serif;font-size:17px;line-height:1.6;overflow-x:hidden; min-height: 100vh;}
        .event-dump-info-page .w{max-width:560px;margin:0 auto;padding:0 24px}
        .event-dump-info-page h1, .event-dump-info-page h2{font-family:Fraunces,Georgia,serif;font-weight:900;line-height:1.05;letter-spacing:-.02em}
        .event-dump-info-page h1{font-size:clamp(44px,13vw,64px)}
        .event-dump-info-page h2{font-size:clamp(32px,9vw,44px);margin-bottom:18px}
        .event-dump-info-page p{margin-bottom:14px;color:var(--muted)}
        .event-dump-info-page p b{color:var(--ink)}
        .event-dump-info-page section{padding:64px 0}
        .event-dump-info-page .hero{padding-top:40px;text-align:center}
        .event-dump-info-page .brand{font-family:Fraunces,serif;font-weight:700;font-size:20px;margin-bottom:28px}
        .event-dump-info-page .hero p{font-size:19px;margin:20px auto 0;max-width:420px}
        /* polaroids */
        .event-dump-info-page .pol{background:#fff;padding:8px 8px 32px;border-radius:4px;box-shadow:0 10px 24px rgba(10,12,40,.22);position:relative;width:150px;flex:none}
        .event-dump-info-page .pol svg{display:block;width:100%;height:auto;aspect-ratio:1}
        .event-dump-info-page .pol span{position:absolute;left:0;right:0;bottom:6px;text-align:center;font-family:Caveat,cursive;font-size:18px;color:#2a2d4a;line-height:1.2}
        .event-dump-info-page .stack{position:relative;height:300px;margin:34px auto 0;max-width:340px}
        .event-dump-info-page .stack .pol{position:absolute;width:158px}
        .event-dump-info-page .stack .a{left:0;top:30px;transform:rotate(-9deg)}
        .event-dump-info-page .stack .b{right:0;top:0;transform:rotate(7deg);z-index:2}
        .event-dump-info-page .stack .c{left:80px;top:120px;transform:rotate(-2deg);z-index:3}
        @keyframes drop{from{opacity:0;translate:0 -30px}to{opacity:1;translate:0 0}}
        .event-dump-info-page .stack .pol{animation:drop .7s cubic-bezier(.2,.8,.3,1) both}
        .event-dump-info-page .stack .b{animation-delay:.15s}
        .event-dump-info-page .stack .c{animation-delay:.3s}
        /* night */
        .event-dump-info-page .night{background:var(--night);color:#fff;border-radius:36px;margin:0 12px;padding:60px 0}
        .event-dump-info-page .night p{color:#C5C9EC}
        .event-dump-info-page .night p b{color:#fff}
        .event-dump-info-page .night h2{color:#fff}
        .event-dump-info-page .lq{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:28px 0}
        .event-dump-info-page .lq div{text-align:center;border-radius:16px;padding:14px 0 10px;background:rgba(255,255,255,.07)}
        .event-dump-info-page .lq strong{display:block;font-family:Fraunces,serif;font-size:38px;line-height:1;color:var(--amber)}
        .event-dump-info-page .lq em{font-style:normal;font-size:12px;color:#C5C9EC;font-weight:600}
        /* rules */
        .event-dump-info-page .rules{list-style:none;padding:0;margin:22px 0}
        .event-dump-info-page .rules li{display:flex;gap:14px;align-items:flex-start;padding:16px 0;border-bottom:1px solid rgba(127,134,180,.25);color:var(--ink);font-weight:600}
        .event-dump-info-page .rules li:last-child{border:0}
        .event-dump-info-page .rules i{font-style:normal;flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:15px;background:var(--pink);color:#fff;font-weight:800}
        .event-dump-info-page .rules li.y i{background:var(--amber);color:#161A33}
        .event-dump-info-page .rules small{display:block;font-weight:400;color:var(--muted);font-size:15px}
        /* strip */
        .event-dump-info-page .strip{display:flex;gap:18px;overflow-x:auto;padding:14px 24px 30px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
        .event-dump-info-page .strip .pol{scroll-snap-align:center;width:170px}
        .event-dump-info-page .strip .pol:nth-child(odd){transform:rotate(-2.5deg)}
        .event-dump-info-page .strip .pol:nth-child(even){transform:rotate(2.5deg);margin-top:14px}
        /* button */
        .event-dump-info-page .btn-back { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: rgba(0,0,0,0.05); color: var(--ink); border-radius: 50%; font-size: 20px; font-weight: bold; border: none; cursor: pointer; position: absolute; top: 20px; left: 20px; z-index: 50; }
        @media (prefers-reduced-motion:reduce){.event-dump-info-page .stack .pol{animation:none}}
      `}} />

      {/* Candados adicionales: translate="no" y className="notranslate" */}
      <div className="event-dump-info-page notranslate" translate="no" ref={containerRef}>
        
        {/* Botón flotante para regresar a Home */}
        <button onClick={() => router.push('/')} className="btn-back">
           ←
        </button>

        <section className="hero">
          <div className="w">
            <div className="brand">Event-Dump</div>
            <h1>Las fotos que no se publican.</h1>
            <p>La del flash en la cara. La risa con la boca llena. El de atrás que salió movido. Las mejores de la noche.</p>
            <div className="stack">
              <div className="pol a"><div data-s="lights"></div><span>2:46 am, cero filtro</span></div>
              <div className="pol b"><div data-s="dance"></div><span>el que salió movido</span></div>
              <div className="pol c"><div data-s="toast"></div><span>¡salud!</span></div>
            </div>
          </div>
        </section>

        <section id="foto" className="w">
          <h2>Sacaste 20 fotos y subiste solo 2 a Instagram.</h2>
          <p>El resto quedó dormido entre capturas de pantalla y memes. Y ahí está lo mejor de esa noche.</p>
        </section>

        <section className="w">
          <h2>¿Qué es un event dump?</h2>
          <p>La recopilación, la colección, la “basura” de un evento. Todo lo que pasó, tal cual pasó.</p>
          <p><b>Acá la basura es oro.</b> Es la prima bailando sola, el brindis con las copas chuecas, el tío dormido en la silla, la torta antes de que alguien le sacara el mejor ángulo.</p>
        </section>

        <div className="night">
          <div className="w">
            <h2>LQNSP</h2>
            <div className="lq">
              <div><strong>L</strong><em>Las</em></div><div><strong>Q</strong><em>Que</em></div><div><strong>N</strong><em>No</em></div><div><strong>S</strong><em>Se</em></div><div><strong>P</strong><em>Publican</em></div>
            </div>
            <p>Son esas fotos que nunca van a pasar por un filtro, pero que cuando las ves después te hacen decir <b>“qué noche”</b>.</p>
            <p>Event-Dump es la <b>red social interna del evento</b>: una sola galería compartida, solo para los que estuvieron. Se llena en vivo, mientras todo sucede.</p>
          </div>
        </div>

        <section className="w">
          <h2>Acá subimos todas.</h2>
          <ul className="rules">
            <li><i>✕</i><div>Sin filtros<small>La luz es la que había. Y estaba buena.</small></div></li>
            <li><i>✕</i><div>Sin tapar a nadie<small>Si estuvo en la noche, está en el álbum.</small></div></li>
            <li><i>✕</i><div>Sin IA que te “arregle”<small>Nadie necesita que le cambien la cara.</small></div></li>
            <li className="y"><i>✓</i><div>Sonrisas reales<small>Las de verdad, con los ojos cerrados y todo.</small></div></li>
            <li className="y"><i>✓</i><div>Momentos frescos<small>Subís, y ya lo ve toda la mesa.</small></div></li>
            <li className="y"><i>✓</i><div>Lo natural de esa noche especial<small>Lo que de verdad pasó.</small></div></li>
          </ul>
        </section>

        <section style={{padding: '20px 0 40px'}}>
          <div className="w"><h2>Para cada noche que importa</h2></div>
          <div className="strip">
            <div className="pol"><div data-s="cake"></div><span>cumple, 12 velas</span></div>
            <div className="pol"><div data-s="lights"></div><span>la boda, a la noche</span></div>
            <div className="pol"><div data-s="trip"></div><span>viaje, ruta 40</span></div>
            <div className="pol"><div data-s="dance"></div><span>la pista, 3 am</span></div>
            <div className="pol"><div data-s="toast"></div><span>el brindis</span></div>
          </div>
          <div className="w"><p>Bodas, cumpleaños, viajes, despedidas, asados, egresos. Si hay gente que quiere acordarse, hay un dump.</p></div>
        </section>

        <div style={{height: '50px'}}></div>
      </div>
    </>
  );
}