// COPIA AQUÍ TUS CREDENCIALES DE FIREBASE
// Instrucciones en el Walkthrough
const firebaseConfig = {
  apiKey: "AIzaSyBDKIYmnslJPv3NX9F5eUQ_A_rQMGGo3uk",
  authDomain: "alarma-pro-a903d.firebaseapp.com",
  databaseURL: "https://alarma-pro-a903d-default-rtdb.firebaseio.com/",
  projectId: "alarma-pro-a903d",
  storageBucket: "alarma-pro-a903d.firebasestorage.app",
  messagingSenderId: "408079567330",
  appId: "1:408079567330:web:a453dbce735dc7fa1ed1bb",
  measurementId: "G-0S1CTDDBF6"
};

// Inicializar Firebase si la config es válida
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "AIzaSyA6tYELfeA9d4N0k1-z5j8Dw9gb0oT_lds_EXAMPLE") {
    try {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase inicializado correctamente");
        
        // Monitoreo de Conexión en tiempo real
        const connectedRef = firebase.database().ref(".info/connected");
        connectedRef.on("value", (snap) => {
            const isConnected = snap.val() === true;
            window.dispatchEvent(new CustomEvent('firebase-connection-changed', { detail: { connected: isConnected } }));
        });
        
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
