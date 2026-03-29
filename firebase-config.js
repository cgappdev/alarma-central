// COPIA AQUÍ TUS CREDENCIALES DE FIREBASE
// Instrucciones en el Walkthrough
const firebaseConfig = {
  apiKey: "AIzaSyA6tYELfeA9d4N0k1-z5j8Dw9gb0oT_lds",
  authDomain: "alarma-central.firebaseapp.com",
  databaseURL: "https://alarma-central-default-rtdb.us-central1.firebasedatabase.app/",
  projectId: "alarma-central",
  storageBucket: "alarma-central.firebasestorage.app",
  messagingSenderId: "115549279331",
  appId: "1:115549279331:web:8f9f59d0a7b52cc6e81456",
  measurementId: "G-NFPMEJEBQ8"
};

// Inicializar Firebase si la config es válida
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "AIzaSyA6tYELfeA9d4N0k1-z5j8Dw9gb0oT_lds_EXAMPLE") {
    try {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase inicializado correctamente");
        
        // Alerta si la URL parece ser la de por defecto de ejemplo
        if (firebaseConfig.databaseURL.includes("default-rtdb")) {
            console.warn("⚠️ Usando Database URL genérica. Si no ves tus datos, verifica la URL en la consola de Firebase.");
        }
    } catch (e) {
        console.error("Error al inicializar Firebase:", e.message);
    }
} else {
    console.warn("Firebase no configurado o usando API Key de ejemplo. Usando modo local.");
}
