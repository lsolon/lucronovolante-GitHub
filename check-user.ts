import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    const userDocRef = doc(db, 'users', '593vO2T47eXy8lYJ8dYQ0xYpD2C3');
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      console.log('User Document Data:');
      console.log(JSON.stringify(docSnap.data(), null, 2));
    } else {
      console.log('User document not found.');
    }
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();

