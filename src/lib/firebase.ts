import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC0ZtnjPzHg6ieIeTYTuqwMiSgofrgulHw",
  authDomain: "amni-contractors.firebaseapp.com",
  databaseURL: "https://amni-contractors.firebaseio.com",
  projectId: "amni-contractors",
  storageBucket: "amni-contractors.appspot.com",
  messagingSenderId: "754512756573",
  appId: "1:754512756573:web:d5c79ebeca11ea64",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
