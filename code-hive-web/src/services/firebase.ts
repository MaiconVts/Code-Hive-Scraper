import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    // credenciais do firebase
    apiKey: "AIzaSyAghaXtNjOCCZBYdPIEv24nDi2j4MHX1RE",
    authDomain: "code-hive-vagas.firebaseapp.com",
    databaseURL: "https://code-hive-vagas-default-rtdb.firebaseio.com",
    projectId: "code-hive-vagas",
    storageBucket: "code-hive-vagas.firebasestorage.app",
    messagingSenderId: "864794527853",
    appId: "1:864794527853:web:c0fa0ce085b8b2775d1764",
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
