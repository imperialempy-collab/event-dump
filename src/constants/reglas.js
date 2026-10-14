// Aquí cambias las reglas del juego sin romper la app
export const REGLAS_APP = {
  TRIAL_LIMITES: {
    FOTOS: 5,
    HISTORIAS: 5,
    AUDIOS: 5,
    RETOS: 5,
    HORAS_AUTODESTRUCCION: 24, // 24 horas si no paga
  },
  PAGADO: {
    DIAS_AUTODESTRUCCION: 5, // 5 días post evento
  },
  HISTORIAS: {
    DURACION_MAXIMA_SEGUNDOS: 15,
    CALIDAD_RESOLUCION: 1080,
  }
};

export const ESTADOS_ALBUM = {
  TRIAL: 'TRIAL',
  PAGADO: 'PAID',
  EXPIRADO: 'EXPIRED'
};