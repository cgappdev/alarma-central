// COPIA AQUÍ TUS CREDENCIALES DE FIREBASE
// Instrucciones en el Walkthrough
const firebaseConfig = {
  apiKey: "AIzaSyA6tYELfeA9d4N0k1-z5j8Dw9gb0oT_lds",
  authDomain: "alarma-central.firebaseapp.com",
  databaseURL: "https://alarma-central-default-rtdb.firebaseio.com",
  projectId: "alarma-central",
  storageBucket: "alarma-central.firebasestorage.app",
  messagingSenderId: "115549279331",
  appId: "1:115549279331:web:8f9f59d0a7b52cc6e81456",
  measurementId: "G-NFPMEJEBQ8"
};

// Inicializar Firebase si la config es válida
if (firebaseConfig.apiKey !== "TU_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase inicializado correctamente");
} else {
    console.warn("Firebase no configurado. Usando modo de almacenamiento local únicamente.");
}
