import * as admin from 'firebase-admin';
import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./firebase-service-account.json', 'utf-8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  try {
    const userDocRef = db.collection('users').doc('593vO2T47eXy8lYJ8dYQ0xYpD2C3');
    const docSnap = await userDocRef.get();
    if (docSnap.exists) {
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
