# Security Specification — Mi Presupuesto Mensual

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every document under `/users/{userId}` and `/users/{userId}/movements/{movementId}` is strictly owned by `request.auth.uid == userId`. No user can read, list, create, update, or delete another user's profile or financial movements.
2. **Identity Integrity**: The `uid` field inside every `UserProfile` and `Movement` document must equal both `request.auth.uid` and the `{userId}` path parameter, and is immutable after creation.
3. **Parent Gate Integrity**: A `Movement` document under `/users/{userId}/movements/{movementId}` can only be created, updated, or deleted if the parent `/users/{userId}` document exists and belongs to `request.auth.uid`.
4. **Temporal & Schema Integrity**: `createdAt` and `updatedAt` timestamps must match `request.time`; `createdAt` is immutable on update; no unexpected/shadow fields are permitted (`hasOnly`).
5. **Financial Value Bounds**: `monthlyBudget` must be a non-negative number (`> 0` once configured, or `>= 0` before onboarding); movement `amount` must be strictly `> 0`; `type` must be `'expense'` or `'income'`; all strings and IDs are strictly size-bounded.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Cross-User Profile Read**: Authenticated as `userA`, `get(/users/userB)` -> `PERMISSION_DENIED`.
2. **Cross-User Movement List**: Authenticated as `userA`, `list(/users/userB/movements)` -> `PERMISSION_DENIED`.
3. **Cross-User Movement Write**: Authenticated as `userA`, `create(/users/userB/movements/m1)` with `uid: 'userB'` -> `PERMISSION_DENIED`.
4. **UID Spoofing on Create**: Authenticated as `userA`, `create(/users/userA/movements/m1)` with `uid: 'userB'` -> `PERMISSION_DENIED`.
5. **Shadow Field Injection on Profile**: Authenticated as `userA`, `create(/users/userA)` including `{ ..., isAdmin: true }` -> `PERMISSION_DENIED`.
6. **Shadow Field Injection on Movement**: Authenticated as `userA`, `update(/users/userA/movements/m1)` including `{ ..., approved: true }` -> `PERMISSION_DENIED`.
7. **ID Poisoning**: Authenticated as `userA`, `create(/users/userA/movements/<1500_char_id>)` -> `PERMISSION_DENIED`.
8. **Negative / Zero Movement Amount**: Authenticated as `userA`, `create(/users/userA/movements/m1)` with `amount: -5000` -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: Authenticated as `userA`, `create(/users/userA)` with `createdAt: Timestamp(2020-01-01)` -> `PERMISSION_DENIED`.
10. **Immutable `createdAt` Tampering**: Authenticated as `userA`, `update(/users/userA)` modifying `createdAt` -> `PERMISSION_DENIED`.
11. **Invalid Movement Type**: Authenticated as `userA`, `create(/users/userA/movements/m1)` with `type: 'transfer'` -> `PERMISSION_DENIED`.
12. **Unauthenticated Write**: `request.auth == null`, `create(/users/userA)` -> `PERMISSION_DENIED`.
