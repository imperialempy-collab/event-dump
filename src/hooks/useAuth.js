import { useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { signInWithPopup, GoogleAuthProvider, signInAnonymously, signOut, onAuthStateChanged } from 'firebase/auth';

export const useAuth = () => {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setCargando(false);
    });
    return () => unsubscribe();
  }, []);

  const loginConGoogle = async () => {
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(auth, provider);
  };

  const loginInvitado = async () => {
    return await signInAnonymously(auth);
  };

  const cerrarSesion = async () => {
    await signOut(auth);
  };

  return { usuario, cargando, loginConGoogle, loginInvitado, cerrarSesion };
};