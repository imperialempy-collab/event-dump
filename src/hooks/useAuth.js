import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { signInWithPopup, GoogleAuthProvider, signInAnonymously, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Registrar o sincronizar en la colección 'usuarios' de Firestore
      if (user && user.email) {
        const emailFormateado = user.email.toLowerCase();
        const userRef = doc(db, 'usuarios', emailFormateado);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            email: emailFormateado,
            nombre: user.displayName || 'Usuario Nuevo',
            creditosDisponibles: 0,
            esLocalSuscrito: false,
            fechaRegistro: new Date().toISOString()
          });
        }
      }

      return result;
    } catch (error) {
      console.error("Error al iniciar sesion con Google:", error);
      throw error;
    }
  };

  const loginInvitado = async () => {
    return await signInAnonymously(auth);
  };

  const cerrarSesion = async () => {
    await signOut(auth);
  };

  return { usuario, cargando, loginConGoogle, loginInvitado, cerrarSesion };
};
