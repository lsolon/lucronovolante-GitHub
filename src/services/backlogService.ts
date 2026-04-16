import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp, 
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { BacklogItem } from '../types';

const BACKLOG_COLLECTION = 'backlog';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function addBacklogItem(text: string): Promise<void> {
  try {
    await addDoc(collection(db, BACKLOG_COLLECTION), {
      text,
      createdAt: serverTimestamp(),
      status: 'pending'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, BACKLOG_COLLECTION);
  }
}

export async function getBacklogItems(): Promise<BacklogItem[]> {
  try {
    const q = query(collection(db, BACKLOG_COLLECTION), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt instanceof Timestamp 
        ? doc.data().createdAt.toDate().toISOString() 
        : new Date().toISOString()
    })) as BacklogItem[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, BACKLOG_COLLECTION);
    return [];
  }
}

export async function deleteBacklogItem(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, BACKLOG_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${BACKLOG_COLLECTION}/${id}`);
  }
}

export async function toggleBacklogItemStatus(id: string, currentStatus: 'pending' | 'completed'): Promise<void> {
  try {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    await updateDoc(doc(db, BACKLOG_COLLECTION, id), {
      status: newStatus
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${BACKLOG_COLLECTION}/${id}`);
  }
}
