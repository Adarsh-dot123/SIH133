import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  updateDoc, 
  addDoc 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyFakeKeyForLocalDevMedFlow",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "medflow-fb6a8.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "medflow-fb6a8",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "medflow-fb6a8.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

const isMock = false;

// Initialize Firebase
let app: any;
let auth: any;
let db: any;

if (!isMock) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    console.warn("Firebase initialization failed, falling back to mock mode:", err);
  }
}

// In-Memory Mock Database Store for dynamic live sync
const mockStore: Record<string, Record<string, any>> = {
  hospitals: {
    "1": {
      id: "1",
      name: "Apollo Hospitals, Greams Road",
      general_beds_available: 6,
      general_beds_total: 15,
      icu_beds_available: 3,
      icu_beds_total: 10,
      ventilators_available: 1,
      ventilators_total: 3,
      oxygen_beds_available: 3,
      oxygen_beds_total: 6,
      doctors_on_duty: 14,
      blood_units: { A_pos: 10, O_neg: 2 }
    },
    "2": {
      id: "2",
      name: "Fortis Malar Hospital, Adyar",
      general_beds_available: 5,
      general_beds_total: 15,
      icu_beds_available: 3,
      icu_beds_total: 10,
      ventilators_available: 1,
      ventilators_total: 3,
      oxygen_beds_available: 3,
      oxygen_beds_total: 6,
      doctors_on_duty: 8,
      blood_units: { B_pos: 6 }
    }
  },
  ambulances: {
    "amb-1": { id: "amb-1", lat: 13.0569, lng: 80.2525, status: "available", hospital: "Apollo Hospitals" },
    "amb-2": { id: "amb-2", lat: 13.0067, lng: 80.2575, status: "busy", hospital: "Fortis Malar" }
  },
  patient_records: {}
};

const mockListeners: Record<string, Array<(data: any) => void>> = {};

// Subscribe listener helper
export const subscribeCollection = (collectionName: string, callback: (data: any[]) => void) => {
  if (!isMock && db) {
    return onSnapshot(collection(db, collectionName), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(docs);
    });
  } else {
    // Mock snapshot simulation
    if (!mockListeners[collectionName]) {
      mockListeners[collectionName] = [];
    }
    mockListeners[collectionName].push(callback);
    // Initial call
    const currentData = Object.values(mockStore[collectionName] || {});
    callback(currentData);
    
    // Return unsubscribe function
    return () => {
      mockListeners[collectionName] = mockListeners[collectionName].filter(cb => cb !== callback);
    };
  }
};

// Update doc helper
export const updateFirestoreDoc = async (collectionName: string, docId: string, data: any) => {
  if (!isMock && db) {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, data);
  } else {
    // Mock store updates
    if (!mockStore[collectionName]) mockStore[collectionName] = {};
    mockStore[collectionName][docId] = {
      ...mockStore[collectionName][docId],
      ...data
    };
    // Notify subscribers
    const updatedCollection = Object.values(mockStore[collectionName]);
    (mockListeners[collectionName] || []).forEach(cb => cb(updatedCollection));
  }
};

// Add doc helper
export const addFirestoreDoc = async (collectionName: string, data: any) => {
  if (!isMock && db) {
    await addDoc(collection(db, collectionName), data);
  } else {
    const docId = Math.random().toString(36).substring(7);
    if (!mockStore[collectionName]) mockStore[collectionName] = {};
    mockStore[collectionName][docId] = { id: docId, ...data };
    // Notify
    const updatedCollection = Object.values(mockStore[collectionName]);
    (mockListeners[collectionName] || []).forEach(cb => cb(updatedCollection));
  }
};

// Auth Simulation User Type
export interface PatientUser {
  uid: string;
  email: string;
  displayName?: string;
  phoneNumber?: string;
}

let mockCurrentUser: PatientUser | null = null;
const mockAuthListeners: Array<(user: PatientUser | null) => void> = [];

export const onPatientAuthStateChanged = (callback: (user: PatientUser | null) => void) => {
  if (!isMock && auth) {
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        callback({
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || undefined,
          phoneNumber: user.phoneNumber || undefined
        });
      } else {
        callback(null);
      }
    });
  } else {
    mockAuthListeners.push(callback);
    callback(mockCurrentUser);
    return () => {
      const idx = mockAuthListeners.indexOf(callback);
      if (idx !== -1) mockAuthListeners.splice(idx, 1);
    };
  }
};

export const signUpPatient = async (email: string, password: string, name: string, phone: string): Promise<PatientUser> => {
  const isFakeKey = firebaseConfig.apiKey.includes("FakeKey");
  if (!isMock && auth && !isFakeKey) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    try {
      await updateFirestoreDoc('patient_records', uid, {
        uid,
        email,
        displayName: name,
        phoneNumber: phone,
        role: 'PATIENT',
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn("Failed to write patient profile to Firestore:", err);
    }
    return {
      uid,
      email: userCredential.user.email || "",
      displayName: name,
      phoneNumber: phone
    };
  } else {
    mockCurrentUser = {
      uid: "mock-uid-" + Math.random().toString(36).substring(7),
      email,
      displayName: name,
      phoneNumber: phone
    };
    if (!mockStore['patient_records']) mockStore['patient_records'] = {};
    mockStore['patient_records'][mockCurrentUser.uid] = {
      uid: mockCurrentUser.uid,
      email,
      displayName: name,
      phoneNumber: phone,
      role: 'PATIENT',
      createdAt: new Date().toISOString()
    };
    mockAuthListeners.forEach(cb => cb(mockCurrentUser));
    return mockCurrentUser;
  }
};

export const loginPatient = async (email: string, password: string): Promise<PatientUser> => {
  const isFakeKey = firebaseConfig.apiKey.includes("FakeKey");
  const isAdmin = email === "admin@medflow.gov.in";
  if (!isMock && auth && !isFakeKey && !isAdmin) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    try {
      await updateFirestoreDoc('patient_records', uid, {
        lastLoginAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn("Failed to update last login in Firestore:", err);
    }
    return {
      uid,
      email: userCredential.user.email || "",
      displayName: userCredential.user.displayName || "Patient User"
    };
  } else {
    mockCurrentUser = {
      uid: isAdmin ? "mock-admin-uid-999" : "mock-uid-12345",
      email,
      displayName: isAdmin ? "Government Admin" : "Ramesh Sundaram"
    };
    if (mockStore['patient_records'] && mockStore['patient_records'][mockCurrentUser.uid]) {
      mockStore['patient_records'][mockCurrentUser.uid].lastLoginAt = new Date().toISOString();
    }
    mockAuthListeners.forEach(cb => cb(mockCurrentUser));
    return mockCurrentUser;
  }
};

export const loginPatientWithGoogle = async (): Promise<PatientUser> => {
  const isFakeKey = firebaseConfig.apiKey.includes("FakeKey");
  if (!isMock && auth && !isFakeKey) {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email || "",
      displayName: userCredential.user.displayName || "Google Patient"
    };
  } else {
    mockCurrentUser = {
      uid: "mock-google-uid-67890",
      email: "googleuser@gmail.com",
      displayName: "Google Demo Patient"
    };
    mockAuthListeners.forEach(cb => cb(mockCurrentUser));
    return mockCurrentUser;
  }
};

export const logoutUser = async (): Promise<void> => {
  if (!isMock && auth) {
    await signOut(auth);
  } else {
    mockCurrentUser = null;
    mockAuthListeners.forEach(cb => cb(null));
  }
};
