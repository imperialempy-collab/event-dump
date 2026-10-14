import { useState, useRef, useCallback } from 'react';
import { REGLAS_APP } from '../constants/reglas';

export const useCamara = () => {
  const [stream, setStream] = useState(null);
  const [grabando, setGrabando] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState(REGLAS_APP.HISTORIAS.DURACION_MAXIMA_SEGUNDOS);
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // Enciende la cámara forzando 1080p vertical
  const iniciarCamara = useCallback(async (soloCamaraTrasera = true) => {
    try {
      const restricciones = {
        video: {
          facingMode: soloCamaraTrasera ? "environment" : "user",
          width: { ideal: 1080, max: 1920 }, // 1080p
          height: { ideal: 1920, max: 1920 },
          frameRate: { ideal: 30, max: 30 }
        },
        audio: true 
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(restricciones);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Error cámara:", error);
      throw new Error("No se pudo acceder a la cámara. Revisa los permisos.");
    }
  }, []);

  // Saca foto y la comprime a JPEG 80% (Ahorro extremo de servidor)
  const capturarFoto = () => {
    if (!videoRef.current || !stream) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
    });
  };

  // Graba historia con tasa de bits baja para que pese ~5MB
  const iniciarGrabacion = (onTerminar) => {
    if (!stream) return;
    chunksRef.current = [];
    
    const opciones = { 
      mimeType: 'video/webm;codecs=vp8,opus',
      videoBitsPerSecond: 2500000 // Tasa baja controlada
    };
    
    try {
      mediaRecorderRef.current = new window.MediaRecorder(stream, opciones);
    } catch (e) {
      mediaRecorderRef.current = new window.MediaRecorder(stream); // Fallback Safari
    }

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
      onTerminar(blob);
      setGrabando(false);
      setTiempoRestante(REGLAS_APP.HISTORIAS.DURACION_MAXIMA_SEGUNDOS);
      clearInterval(timerRef.current);
    };

    mediaRecorderRef.current.start();
    setGrabando(true);
    setTiempoRestante(REGLAS_APP.HISTORIAS.DURACION_MAXIMA_SEGUNDOS);

    // Reloj de autodestrucción a los 15 segundos
    timerRef.current = setInterval(() => {
      setTiempoRestante((prev) => {
        if (prev <= 1) {
          detenerGrabacion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const detenerGrabacion = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const apagarCamara = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  return { videoRef, iniciarCamara, capturarFoto, iniciarGrabacion, detenerGrabacion, apagarCamara, grabando, tiempoRestante };
};