import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, Timestamp, writeBatch, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { GlobalStats } from '../types';
import { cleanObject } from '../lib/utils';

const STATS_DOC_PATH = 'stats/global';
const VISITOR_KEY = 'lucro_no_volante_visitor_id';

export async function trackVisit(user: { uid: string, email?: string | null, displayName?: string | null }) {
  // Skip tracking for admin and internal test account
  const excludedEmails = ['leandrosolon@gmail.com'];
  if (user.email && excludedEmails.includes(user.email)) {
    console.log('Admin/Test visit - skipping stats increment');
    return;
  }

  try {
    const statsRef = doc(db, STATS_DOC_PATH);
    const userRef = doc(db, 'users', user.uid);
    
    // Check if it's a unique visitor using localStorage
    const isReturningVisitor = localStorage.getItem(VISITOR_KEY);
    const isUnique = !isReturningVisitor;

    const batch = writeBatch(db);

    // Update Global Stats
    batch.set(statsRef, cleanObject({
      totalVisits: increment(1),
      uniqueVisitors: isUnique ? increment(1) : increment(0),
      lastUpdate: serverTimestamp()
    }), { merge: true });

    // Update User Stats
    batch.set(userRef, cleanObject({
      email: user.email,
      displayName: user.displayName,
      visitCount: increment(1),
      lastSeen: serverTimestamp()
    }), { merge: true });

    await batch.commit();

    if (isUnique) {
      localStorage.setItem(VISITOR_KEY, 'true');
    }
  } catch (error) {
    console.error('Error tracking visit:', error);
  }
}

export async function trackContribution(userId: string) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      hasContributed: true,
      lastSeen: serverTimestamp()
    });
  } catch (error) {
    console.error('Error tracking contribution:', error);
  }
}

export async function getAllUsers(): Promise<any[]> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('lastSeen', 'desc'), limit(100)); // Added limit(100) to drastically reduce reads
    const querySnapshot = await getDocs(q);
    const excludedEmails = ['leandrosolon@gmail.com'];
    
    return querySnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          lastSeen: data.lastSeen instanceof Timestamp 
            ? data.lastSeen.toDate().toISOString() 
            : data.lastSeen
        };
      })
      .filter((user: any) => user.email && !excludedEmails.includes(user.email));
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}

export async function updateUserTrial(userId: string, trialStartDate: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { trialStartDate }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating user trial:', error);
    return false;
  }
}

export async function getGlobalStats(): Promise<GlobalStats | null> {
  try {
    const statsRef = doc(db, STATS_DOC_PATH);
    const statsSnap = await getDoc(statsRef);
    if (statsSnap.exists()) {
      const data = statsSnap.data();
      return {
        totalVisits: data.totalVisits || 0,
        uniqueVisitors: data.uniqueVisitors || 0,
        lastUpdate: data.lastUpdate instanceof Timestamp 
          ? data.lastUpdate.toDate().toISOString() 
          : new Date().toISOString()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting stats:', error);
    return null;
  }
}
