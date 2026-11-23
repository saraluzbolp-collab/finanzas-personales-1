import {
  doc,
  collection,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  deleteField,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '@/src/firebase';
import { Movement } from '@/src/types';

export interface UserBudgetProfile {
  uid: string;
  displayName: string;
  email?: string;
  monthlyBudget: number;
  hasConfiguredBudget: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

// Validation limits synchronized with firebase-blueprint.json & firestore.rules
const MAX_DISPLAY_NAME = 100;
const MAX_EMAIL = 254;
const MAX_CATEGORY = 60;
const MAX_DATE = 40;
const MAX_DESCRIPTION = 200;
const MAX_PAYMENT_METHOD = 60;
const MAX_OBSERVATIONS = 500;
const MAX_AMOUNT = 1_000_000_000_000;

function sanitizeString(value: string | undefined | null, maxLength: number, fallback = ''): string {
  const cleaned = (value ?? '').trim();
  if (!cleaned) return fallback;
  return cleaned.slice(0, maxLength);
}

export function resolveDisplayName(user: User, customName?: string): string {
  const candidate =
    customName?.trim() ||
    user.displayName?.trim() ||
    user.email?.split('@')[0] ||
    'Usuario';
  return sanitizeString(candidate, MAX_DISPLAY_NAME, 'Usuario');
}

export async function saveInitialUserBudget(
  user: User,
  monthlyBudget: number,
  customDisplayName?: string,
  profileExists = false
): Promise<void> {
  const sanitizedBudget = Math.min(Math.max(Number(monthlyBudget), 0), MAX_AMOUNT);
  if (!Number.isFinite(sanitizedBudget) || sanitizedBudget <= 0) {
    throw new Error('El presupuesto mensual debe ser mayor a cero.');
  }

  const displayName = resolveDisplayName(user, customDisplayName);
  const email = user.email ? sanitizeString(user.email, MAX_EMAIL) : undefined;
  const userDocRef = doc(db, 'users', user.uid);
  const path = `users/${user.uid}`;

  try {
    if (profileExists) {
      await updateDoc(userDocRef, {
        displayName,
        monthlyBudget: sanitizedBudget,
        hasConfiguredBudget: true,
        updatedAt: serverTimestamp(),
      });
    } else {
      const payload: Record<string, unknown> = {
        uid: user.uid,
        displayName,
        monthlyBudget: sanitizedBudget,
        hasConfiguredBudget: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (email) {
        payload.email = email;
      }
      await setDoc(userDocRef, payload);
    }
  } catch (error) {
    handleFirestoreError(error, profileExists ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function updateUserMonthlyBudget(
  user: User,
  monthlyBudget: number
): Promise<void> {
  const sanitizedBudget = Math.min(Math.max(Number(monthlyBudget), 0), MAX_AMOUNT);
  if (!Number.isFinite(sanitizedBudget) || sanitizedBudget <= 0) {
    throw new Error('El presupuesto mensual debe ser mayor a cero.');
  }

  const path = `users/${user.uid}`;
  try {
    await updateDoc(doc(db, 'users', user.uid), {
      monthlyBudget: sanitizedBudget,
      hasConfiguredBudget: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createUserMovement(
  user: User,
  movement: Omit<Movement, 'id'>
): Promise<string> {
  const amount = Number(movement.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    throw new Error('El monto del movimiento debe ser un número mayor a cero.');
  }

  const type: 'expense' | 'income' = movement.type === 'income' ? 'income' : 'expense';
  const category = sanitizeString(movement.category, MAX_CATEGORY, 'Otros');
  const date = sanitizeString(movement.date, MAX_DATE, new Date().toISOString().split('T')[0]);
  const description = sanitizeString(movement.description, MAX_DESCRIPTION, 'Movimiento');

  const payload: Record<string, unknown> = {
    uid: user.uid,
    amount,
    category,
    date,
    description,
    type,
    createdAt: serverTimestamp(),
  };

  if (movement.paymentMethod && movement.paymentMethod.trim()) {
    payload.paymentMethod = sanitizeString(movement.paymentMethod, MAX_PAYMENT_METHOD);
  }
  if (movement.observations && movement.observations.trim()) {
    payload.observations = sanitizeString(movement.observations, MAX_OBSERVATIONS);
  }

  const path = `users/${user.uid}/movements`;
  try {
    const docRef = await addDoc(collection(db, 'users', user.uid, 'movements'), payload);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateUserMovement(
  user: User,
  movementId: string,
  updates: Partial<Pick<Movement, 'amount' | 'category' | 'date' | 'description' | 'paymentMethod' | 'observations'>>
): Promise<void> {
  const amount = Number(updates.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    throw new Error('El monto del movimiento debe ser un número mayor a cero.');
  }

  const description = sanitizeString(updates.description, MAX_DESCRIPTION);
  if (!description) {
    throw new Error('La descripción del movimiento es obligatoria.');
  }

  const category = sanitizeString(updates.category, MAX_CATEGORY);
  if (!category) {
    throw new Error('La categoría del movimiento es obligatoria.');
  }

  const date = sanitizeString(updates.date, MAX_DATE);
  if (!date) {
    throw new Error('La fecha del movimiento es obligatoria.');
  }

  const payload: Record<string, unknown> = {
    amount,
    category,
    date,
    description,
    paymentMethod: updates.paymentMethod?.trim()
      ? sanitizeString(updates.paymentMethod, MAX_PAYMENT_METHOD)
      : deleteField(),
    observations: updates.observations?.trim()
      ? sanitizeString(updates.observations, MAX_OBSERVATIONS)
      : deleteField(),
  };

  const path = `users/${user.uid}/movements/${movementId}`;
  try {
    await updateDoc(doc(db, 'users', user.uid, 'movements', movementId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteUserMovement(
  user: User,
  movementId: string
): Promise<void> {
  const path = `users/${user.uid}/movements/${movementId}`;
  try {
    await deleteDoc(doc(db, 'users', user.uid, 'movements', movementId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
