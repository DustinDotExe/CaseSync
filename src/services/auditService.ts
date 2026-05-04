import { db } from '../firebase';
import { collection, addDoc, deleteDoc, updateDoc, doc, query, where, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { AuditLogEntry, AuditCategory, CurrentUser } from '../types';

export interface AuditEventParams {
  participantId: string;
  caseManagerUid: string;
  category: AuditCategory;
  description: string;
  details?: {
    field?: string;
    oldValue?: string;
    newValue?: string;
  };
  currentUser: CurrentUser;
}

export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  const action =
    params.category === 'participant_created' ? 'created' as const
    : params.category === 'participant_deleted' ? 'deleted' as const
    : 'updated' as const;

  try {
    await addDoc(collection(db, 'auditLog'), {
      participantId: params.participantId,
      caseManagerUid: params.caseManagerUid,
      action,
      category: params.category,
      description: params.description,
      details: params.details ?? null,
      changedBy: {
        uid: params.currentUser.uid,
        displayName: params.currentUser.displayName ?? 'Unknown User',
        email: params.currentUser.email ?? ''
      },
      timestamp: serverTimestamp()
    });
  } catch (err) {
    // Audit failures must not break the calling operation
    console.error('Audit log write failed:', err);
  }
}

export async function deleteAuditEntry(entryId: string): Promise<void> {
  await deleteDoc(doc(db, 'auditLog', entryId));
}

export async function updateAuditEntry(
  entryId: string,
  description: string,
  details?: { field?: string; oldValue?: string; newValue?: string } | null,
  date?: Date
): Promise<void> {
  const payload: Record<string, unknown> = { description, details: details ?? null };
  if (date) payload.timestamp = Timestamp.fromDate(date);
  await updateDoc(doc(db, 'auditLog', entryId), payload);
}

export function subscribeToAuditLog(
  participantId: string,
  caseManagerUid: string,
  callback: (entries: AuditLogEntry[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, 'auditLog'),
    where('caseManagerUid', '==', caseManagerUid),
    where('participantId', '==', participantId),
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const entries = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogEntry));
      callback(entries);
    },
    (err) => {
      console.error('Audit log subscription error:', err);
      onError?.(err);
    }
  );
}
