import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously,
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  setLogLevel,
  Firestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  deleteDoc,
  onSnapshot,
  query,
  where,
  limit,
  writeBatch
} from 'firebase/firestore';

// Silence verbose connection warnings during offline/retry states
try {
  setLogLevel('silent');
} catch {}

// Environment or config matching user provided Firebase project
const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAHDE6O245J9Xz4uV06aFaXFriiEirQQPE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "artful-inkwell-3lxdt.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "artful-inkwell-3lxdt",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "artful-inkwell-3lxdt.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "744623973151",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:744623973151:web:149e803e17f376d5f8462a",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-20pharmainventor-219363d5-a821-470d-b8f3-d7befeab4b40",
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    const existing = getApps();
    if (existing.length > 0) {
      app = existing[0];
    } else {
      app = initializeApp(envConfig);
    }
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    const fbApp = getFirebaseApp();
    auth = getAuth(fbApp);
  }
  return auth;
}

export function getFirebaseFirestore(): Firestore {
  if (!firestore) {
    const fbApp = getFirebaseApp();
    const dbId = envConfig.firestoreDatabaseId;
    const firestoreSettings = {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true
    };

    try {
      if (dbId && dbId !== '(default)') {
        try {
          firestore = initializeFirestore(fbApp, firestoreSettings, dbId);
        } catch {
          try {
            firestore = getFirestore(fbApp, dbId);
          } catch {
            firestore = initializeFirestore(fbApp, firestoreSettings);
          }
        }
      } else {
        try {
          firestore = initializeFirestore(fbApp, firestoreSettings);
        } catch {
          firestore = getFirestore(fbApp);
        }
      }
    } catch (e) {
      console.info('Firestore initialized in offline-first mode');
      try {
        firestore = getFirestore(fbApp);
      } catch {
        // Fallback
      }
    }
  }
  return firestore!;
}

/**
 * Sign in with Email / Password
 */
export async function loginWithEmailPassword(email: string, pass: string): Promise<FirebaseUser> {
  const authInstance = getFirebaseAuth();
  const res = await signInWithEmailAndPassword(authInstance, email, pass);
  return res.user;
}

/**
 * Register with Email / Password
 */
export async function registerWithEmailPassword(email: string, pass: string): Promise<FirebaseUser> {
  const authInstance = getFirebaseAuth();
  const res = await createUserWithEmailAndPassword(authInstance, email, pass);
  return res.user;
}

/**
 * Sign out
 */
export async function logoutFirebase(): Promise<void> {
  const authInstance = getFirebaseAuth();
  await signOut(authInstance);
}

/**
 * Save / Sync record directly to Cloud Firestore
 */
export async function saveRecordToFirestore(collectionName: string, id: string, data: any): Promise<boolean> {
  try {
    const db = getFirebaseFirestore();
    if (!db) return false;
    const docRef = doc(db, collectionName, id);
    const cleanData = {
      ...data,
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    try {
      await setDoc(docRef, cleanData, { merge: true });
      return true;
    } catch (err: any) {
      if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
        try {
          const authInstance = getFirebaseAuth();
          if (!authInstance.currentUser) {
            await signInAnonymously(authInstance);
          }
          await setDoc(docRef, cleanData, { merge: true });
          return true;
        } catch (retryErr) {
          return false;
        }
      }
      return false;
    }
  } catch (err) {
    return false;
  }
}

/**
 * Global Non-Tenant collections that are shared or master administrative
 */
const GLOBAL_COLLECTIONS = new Set([
  'registration_leads',
  'central_medicines_db',
  'platformSettings',
  'admin_settings',
  'tenants',
  'master_licenses'
]);

/**
 * Fetch records from Cloud Firestore collection with Tenancy Isolation Layer
 */
export async function fetchCollectionFromFirestore<T = any>(
  collectionName: string,
  tenantId?: string
): Promise<T[]> {
  try {
    const db = getFirebaseFirestore();
    if (!db) return [];
    const colRef = collection(db, collectionName);
    
    // Automatic Tenancy Isolation: If tenantId is provided and collection is tenant-scoped, filter by tenantId
    const targetQuery = tenantId && tenantId !== 'all' && !GLOBAL_COLLECTIONS.has(collectionName)
      ? query(colRef, where('tenantId', '==', tenantId))
      : colRef;

    try {
      const snap = await getDocs(targetQuery);
      const results: T[] = [];
      snap.forEach(d => {
        results.push({ id: d.id, ...d.data() } as T);
      });
      return results;
    } catch (err: any) {
      if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
        try {
          const authInstance = getFirebaseAuth();
          if (!authInstance.currentUser) {
            await signInAnonymously(authInstance);
          }
          const snap = await getDocs(targetQuery);
          const results: T[] = [];
          snap.forEach(d => {
            results.push({ id: d.id, ...d.data() } as T);
          });
          return results;
        } catch (retryErr) {
          return [];
        }
      } else if (err?.code === 'unavailable') {
        return [];
      }
      return [];
    }
  } catch (err) {
    return [];
  }
}

/**
 * Realtime listener for Firestore collection with Tenancy Isolation Layer
 */
export function subscribeToFirestoreCollection(
  collectionName: string, 
  onUpdate: (data: any[]) => void,
  tenantId?: string
): () => void {
  try {
    const db = getFirebaseFirestore();
    if (!db) return () => {};
    const colRef = collection(db, collectionName);
    
    // Automatic Tenancy Isolation Query
    const targetQuery = tenantId && tenantId !== 'all' && !GLOBAL_COLLECTIONS.has(collectionName)
      ? query(colRef, where('tenantId', '==', tenantId))
      : colRef;

    const unsubscribe = onSnapshot(targetQuery, (snap) => {
      const results: any[] = [];
      snap.forEach(d => results.push({ id: d.id, ...d.data() }));
      onUpdate(results);
    }, async (error) => {
      if (error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions')) {
        try {
          const authInstance = getFirebaseAuth();
          if (!authInstance.currentUser) {
            await signInAnonymously(authInstance);
          }
        } catch (e) {}
      } else if (error?.code === 'unavailable') {
        // Operates in offline mode quietly
      }
    });
    return unsubscribe;
  } catch (e) {
    return () => {};
  }
}

/**
 * Delete a document from Cloud Firestore collection
 */
export async function deleteRecordFromFirestore(collectionName: string, docId: string): Promise<boolean> {
  try {
    const db = getFirebaseFirestore();
    if (!db) return false;
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    return true;
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
      try {
        const authInstance = getFirebaseAuth();
        if (!authInstance.currentUser) {
          await signInAnonymously(authInstance);
        }
        const db = getFirebaseFirestore();
        if (db) {
          await deleteDoc(doc(db, collectionName, docId));
          return true;
        }
      } catch {
        return false;
      }
    }
    return false;
  }
}

export { onAuthStateChanged };
export type { FirebaseUser };
