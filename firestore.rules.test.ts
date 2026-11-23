/**
 * Security Rules Verification Suite (Dirty Dozen Payloads)
 * Evaluates all 12 adversarial payloads from security_spec.md against firestore.rules.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  authUid: string | null;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Cross-User Profile Read',
    authUid: 'userA',
    operation: 'get',
    path: '/users/userB',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-User Movement List',
    authUid: 'userA',
    operation: 'list',
    path: '/users/userB/movements',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-User Movement Write',
    authUid: 'userA',
    operation: 'create',
    path: '/users/userB/movements/mov_1',
    payload: {
      uid: 'userB',
      amount: 15000,
      category: 'Alimentación',
      date: '2026-11-23',
      description: 'Almuerzo',
      type: 'expense',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'UID Spoofing on Create',
    authUid: 'userA',
    operation: 'create',
    path: '/users/userA/movements/mov_1',
    payload: {
      uid: 'userB',
      amount: 15000,
      category: 'Alimentación',
      date: '2026-11-23',
      description: 'Almuerzo',
      type: 'expense',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow Field Injection on Profile',
    authUid: 'userA',
    operation: 'create',
    path: '/users/userA',
    payload: {
      uid: 'userA',
      displayName: 'Test',
      monthlyBudget: 1000000,
      hasConfiguredBudget: true,
      isAdmin: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Shadow Field Injection on Movement',
    authUid: 'userA',
    operation: 'update',
    path: '/users/userA/movements/mov_1',
    payload: {
      approved: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'ID Poisoning',
    authUid: 'userA',
    operation: 'create',
    path: `/users/userA/movements/${'a'.repeat(150)}`,
    payload: {
      uid: 'userA',
      amount: 10000,
      category: 'Transporte',
      date: '2026-11-23',
      description: 'Bus',
      type: 'expense',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Negative / Zero Movement Amount',
    authUid: 'userA',
    operation: 'create',
    path: '/users/userA/movements/mov_2',
    payload: {
      uid: 'userA',
      amount: -5000,
      category: 'Transporte',
      date: '2026-11-23',
      description: 'Bus',
      type: 'expense',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client Timestamp Forgery',
    authUid: 'userA',
    operation: 'create',
    path: '/users/userA',
    payload: {
      uid: 'userA',
      displayName: 'Test',
      monthlyBudget: 1000000,
      hasConfiguredBudget: true,
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Immutable createdAt Tampering',
    authUid: 'userA',
    operation: 'update',
    path: '/users/userA',
    payload: {
      createdAt: '2025-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Invalid Movement Type',
    authUid: 'userA',
    operation: 'create',
    path: '/users/userA/movements/mov_3',
    payload: {
      uid: 'userA',
      amount: 20000,
      category: 'Alimentación',
      date: '2026-11-23',
      description: 'Cena',
      type: 'transfer',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unauthenticated Write',
    authUid: null,
    operation: 'create',
    path: '/users/userA',
    payload: {
      uid: 'userA',
      displayName: 'Anon',
      monthlyBudget: 500000,
      hasConfiguredBudget: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
];
