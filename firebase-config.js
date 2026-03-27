// COPIA AQUÍ TUS CREDENCIALES DE FIREBASE
// Instrucciones en el Walkthrough
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  databaseURL: "https://TU_PROYECTO-default-rtdb.firebaseio.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_ID",
  appId: "TU_APP_ID"
};

// Inicializar Firebase si la config es válida
if (firebaseConfig.apiKey !== "TU_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase inicializado correctamente");
} else {
    console.warn("Firebase no configurado. Usando modo de almacenamiento local únicamente.");
}
