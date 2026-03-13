import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Expense, Group, Invite, Settlement, UserProfile } from './types';
import { generateToken } from './types';

export async function createUserProfile(
  uid: string,
  displayName: string,
  email: string
): Promise<void> {
  await setDoc(doc(db, 'users', uid), {
    uid,
    displayName,
    email,
    createdAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export function subscribeToUserGroups(
  uid: string,
  callback: (groups: Group[]) => void
): () => void {
  const q = query(collection(db, 'groups'), where('members', 'array-contains', uid));
  return onSnapshot(q, (snap) => {
    const groups = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Group));
    callback(groups);
  });
}

export async function createGroup(
  name: string,
  category: Group['category'],
  currency: string,
  createdBy: string,
  creatorProfile: { displayName: string; email: string }
): Promise<string> {
  const ref = await addDoc(collection(db, 'groups'), {
    name,
    category,
    currency,
    createdBy,
    members: [createdBy],
    memberDetails: {
      [createdBy]: {
        displayName: creatorProfile.displayName,
        email: creatorProfile.email,
      },
    },
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeToGroup(
  groupId: string,
  callback: (group: Group | null) => void
): () => void {
  return onSnapshot(doc(db, 'groups', groupId), (snap) => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as Group) : null);
  });
}

export function subscribeToGroupExpenses(
  groupId: string,
  callback: (expenses: Expense[]) => void
): () => void {
  const q = query(
    collection(db, 'groups', groupId, 'expenses'),
    orderBy('date', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const expenses = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
    callback(expenses);
  });
}

export async function addExpense(
  groupId: string,
  description: string,
  amount: number,
  paidBy: string,
  splits: Record<string, number>,
  createdBy: string
): Promise<void> {
  await addDoc(collection(db, 'groups', groupId, 'expenses'), {
    description,
    amount,
    paidBy,
    splits,
    date: serverTimestamp(),
    createdBy,
    createdAt: serverTimestamp(),
  });
}

export async function updateGroup(
  groupId: string,
  fields: { name?: string; category?: import('./types').GroupCategory; currency?: string }
): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId), fields);
}

export async function deleteGroup(groupId: string): Promise<void> {
  const batch = writeBatch(db);
  // Delete all expenses
  const expSnap = await getDocs(collection(db, 'groups', groupId, 'expenses'));
  expSnap.forEach((d) => batch.delete(d.ref));
  // Delete all settlements
  const settSnap = await getDocs(collection(db, 'groups', groupId, 'settlements'));
  settSnap.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  // Delete the group document itself
  await deleteDoc(doc(db, 'groups', groupId));
}

export async function updateExpense(
  groupId: string,
  expenseId: string,
  description: string,
  amount: number,
  paidBy: string,
  splits: Record<string, number>
): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId, 'expenses', expenseId), {
    description,
    amount,
    paidBy,
    splits,
  });
}

export async function deleteExpense(groupId: string, expenseId: string): Promise<void> {
  await deleteDoc(doc(db, 'groups', groupId, 'expenses', expenseId));
}

export async function createInvite(
  group: Group,
  createdBy: string,
  existingToken?: string
): Promise<string> {
  // Reuse stored token — avoid creating a new invite doc on every tap
  if (existingToken) return existingToken;

  const token = generateToken();
  await setDoc(doc(db, 'invites', token), {
    groupId: group.id,
    createdBy,
    createdAt: serverTimestamp(),
    // Embed preview so the web join page can display without auth
    groupName: group.name,
    groupCategory: group.category,
    groupCurrency: group.currency,
    groupMemberCount: group.members.length,
  });
  // Persist token in the group so future taps reuse it
  await updateDoc(doc(db, 'groups', group.id), { inviteToken: token });
  return token;
}

export function subscribeToGroupSettlements(
  groupId: string,
  callback: (settlements: Settlement[]) => void
): () => void {
  const q = query(
    collection(db, 'groups', groupId, 'settlements'),
    orderBy('date', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Settlement)));
  });
}

export async function addSettlement(
  groupId: string,
  from: string,
  to: string,
  amount: number,
  note?: string
): Promise<void> {
  await addDoc(collection(db, 'groups', groupId, 'settlements'), {
    from,
    to,
    amount,
    note: note ?? '',
    date: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
}

export async function updateGroupWhiteboard(
  groupId: string,
  content: string
): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId), { whiteboard: content });
}

export async function getInvite(token: string): Promise<Invite | null> {
  const snap = await getDoc(doc(db, 'invites', token));
  return snap.exists() ? (snap.data() as Invite) : null;
}

export async function joinGroup(
  token: string,
  uid: string,
  userProfile: { displayName: string; email: string }
): Promise<string | null> {
  const invite = await getInvite(token);
  if (!invite) return null;

  await updateDoc(doc(db, 'groups', invite.groupId), {
    members: arrayUnion(uid),
    [`memberDetails.${uid}`]: {
      displayName: userProfile.displayName,
      email: userProfile.email,
    },
  });

  return invite.groupId;
}
