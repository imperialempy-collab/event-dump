import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { signInWithPopup, GoogleAuthProvider, signInAnonymously, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const useAuth = () => {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUsuario(user);
      
      // Sincronización automática garantizada por UID
      if (user && user.email) {
        try {
          const userRef = doc(db, 'usuarios', user.uid);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: user.uid,
              email: user.email.toLowerCase(),
              nombre: user.displayName || 'Usuario Nuevo',
              creditosDisponibles: 0,
              esLocalSuscrito: false,
              fechaRegistro: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error("Error sincronizando usuario:", error);
        }
      }
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
