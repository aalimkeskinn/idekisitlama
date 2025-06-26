import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const useFirestore = <T extends { id: string; createdAt?: Date }>(collectionName: string) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        })) as T[];
        
        setData(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [collectionName]);

  const add = async (item: Omit<T, 'id' | 'createdAt'>) => {
    try {
      console.log('🔥 Firebase ADD işlemi başlatıldı:', { collectionName, item });
      
      const docRef = await addDoc(collection(db, collectionName), {
        ...item,
        createdAt: Timestamp.now()
      });
      
      console.log('✅ Firebase ADD başarılı:', { docId: docRef.id });
      return { success: true, id: docRef.id };
    } catch (err: any) {
      console.error('❌ Firebase ADD hatası:', err);
      return { success: false, error: err.message };
    }
  };

  const update = async (id: string, updates: Partial<Omit<T, 'id' | 'createdAt'>>) => {
    try {
      console.log('🔥 Firebase UPDATE işlemi başlatıldı:', { 
        collectionName, 
        id, 
        updates,
        updateKeys: Object.keys(updates)
      });

      if (!id) {
        throw new Error('Document ID is required for update');
      }

      // CRITICAL: Use setDoc with merge option for better reliability
      const docRef = doc(db, collectionName, id);
      
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      };

      console.log('🔥 Firebase setDoc çağrılıyor:', { docRef: docRef.path, updateData });

      // Use setDoc with merge: true instead of updateDoc for better reliability
      await setDoc(docRef, updateData, { merge: true });
      
      console.log('✅ Firebase UPDATE başarılı:', { id, updatedFields: Object.keys(updates) });
      return { success: true };
    } catch (err: any) {
      console.error('❌ Firebase UPDATE hatası:', {
        error: err,
        message: err.message,
        code: err.code,
        id,
        collectionName
      });
      return { success: false, error: err.message };
    }
  };

  const remove = async (id: string) => {
    try {
      console.log('🔥 Firebase DELETE işlemi başlatıldı:', { collectionName, id });
      
      if (!id) {
        throw new Error('Document ID is required for delete');
      }

      await deleteDoc(doc(db, collectionName, id));
      
      console.log('✅ Firebase DELETE başarılı:', { id });
      return { success: true };
    } catch (err: any) {
      console.error('❌ Firebase DELETE hatası:', err);
      return { success: false, error: err.message };
    }
  };

  // ENHANCED: Add a method to check if document exists
  const exists = async (id: string): Promise<boolean> => {
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDocs(query(collection(db, collectionName)));
      return docSnap.docs.some(doc => doc.id === id);
    } catch (err) {
      console.error('❌ Firebase EXISTS check hatası:', err);
      return false;
    }
  };

  return { data, loading, error, add, update, remove, exists };
};