import { useState } from 'react';
import { Participant, ParticipantPortal, Signature, MilestonePhase } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import SignaturePad from './SignaturePad';
import {
  Link2, Unlink, Copy, RefreshCw, PenLine, CheckCircle2, Clock,
  ChevronDown, ChevronUp, Loader2, Trash2, X
} from 'lucide-react';

interface ShareAndSignProps {
  participant: Participant;
  portalDoc: ParticipantPortal | null;
  userTitle: string;
  milestonePhases: MilestonePhase[];
  onGenerateLink: () => Promise<void>;
  onRevokeLink: () => Promise<void>;
  onSyncPortal: () => Promise<void>;
  onSignAsCaseManager: (sig: Signature) => Promise<void>;
  onRemoveSignature: (signatureField: 'caseManagerSignature' | 'participantSignature') => Promise<void>;
  onClose?: () => void;
}

function formatSignedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch {
    return iso;
  }
}

function formatActionError(err: unknown, fallback: string) {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code?: unknown }).code) : '';
  const message = err instanceof Error ? err.message : '';

  if (code.includes('permission-denied')) {
    if (message.includes('creating participant portal')) {
      return 'Firestore denied creating the participant portal. Deploy the participantPortals rules to the active Firestore database, then try again.';
    }
    if (message.includes('saving link token to participant')) {
      return 'Firestore created the portal but denied saving the link token to the participant record. Deploy the updated participants rules, then try again.';
    }
    return 'Firestore denied this secure-link change. Make sure the participant portal rules are deployed to the active database, then try again.';
  }
  if (message.includes('Unsupported field value: undefined')) {
    return 'The case plan has an empty optional field Firestore cannot save. Please try again; the link payload has been cleaned up.';
  }
  return fallback;
}

function SignatureBadge({
  sig,
  label,
  onRemove,
  removing,
}: {
  sig: Signature;
  label: string;
  onRemove: () => void;
  removing: boolean;
}) {
  return (
    <div className="border border-burnt-peach-100 dark:border-burnt-peach-900 rounded-xl p-3 space-y-1.5 bg-burnt-peach-50/50 dark:bg-burnt-peach-950/20">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="w-4 h-4 text-burnt-peach-600 dark:text-burnt-peach-400 shrink-0" />
          <span className="text-xs font-semibold text-burnt-peach-700 dark:text-burnt-peach-400 uppercase tracking-wider truncate">{label} — Signed</span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onRemove}
          disabled={removing}
          className="h-7 px-2 shrink-0 text-burnt-peach-600 dark:text-burnt-peach-400 hover:bg-burnt-peach-100/70 dark:hover:bg-burnt-peach-950/40 text-xs font-semibold"
          title={`Remove ${label.toLowerCase()} signature`}
        >
          {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          <span className="ml-1.5 hidden sm:inline">Remove</span>
        </Button>
      </div>
      {sig.type === 'drawn' && sig.imageData ? (
        <img src={sig.imageData} alt={`${label} signature`} className="max-h-14 border border-slate-100 dark:border-slate-700 rounded-lg bg-white" />
      ) : (
        <p className="signature-script text-2xl text-slate-700 dark:text-slate-300">{sig.name}</p>
      )}
      <p className="text-xs text-slate-400 dark:text-slate-500">
        {sig.name} &middot; {formatSignedAt(sig.signedAt)}
      </p>
    </div>
  );
}

export default function ShareAndSign({
  participant,
  portalDoc,
  userTitle,
  onGenerateLink,
  onRevokeLink,
  onSyncPortal,
  onSignAsCaseManager,
  onRemoveSignature,
  onClose,
}: ShareAndSignProps) {
  const [generatingLink, setGeneratingLink] = useState(false);
  const [revokingLink, setRevokingLink] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [syncingPortal, setSyncingPortal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSignPad, setShowSignPad] = useState(false);
  const [signingAsCM, setSigningAsCM] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [removingSignature, setRemovingSignature] = useState<'caseManagerSignature' | 'participantSignature' | null>(null);

  const shareToken = participant.shareToken;
  const portalUrl = shareToken ? `${window.location.origin}/p/${shareToken}` : null;

  const updatedAt = portalDoc?.updatedAt?.toDate
    ? portalDoc.updatedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const handleGenerateLink = async () => {
    setGeneratingLink(true);
    setLinkError(null);
    try {
      await onGenerateLink();
    } catch (err) {
      setLinkError(formatActionError(err, 'Could not generate the secure link. Check your connection and Firestore permissions, then try again.'));
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleRevokeLink = async () => {
    setRevokingLink(true);
    setLinkError(null);
    try {
      await onRevokeLink();
      setConfirmRevoke(false);
    } catch (err) {
      setLinkError(formatActionError(err, 'Could not revoke this link. Please try again.'));
    } finally {
      setRevokingLink(false);
    }
  };

  const handleSync = async () => {
    setSyncingPortal(true);
    setLinkError(null);
    try {
      await onSyncPortal();
    } catch (err) {
      setLinkError(formatActionError(err, 'Could not sync the portal. Please try again.'));
    } finally {
      setSyncingPortal(false);
    }
  };

  const handleCopy = async () => {
    if (!portalUrl) return;
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignAsCaseManager = async (sig: Signature) => {
    setSigningAsCM(true);
    setLinkError(null);
    try {
      await onSignAsCaseManager(sig);
      setShowSignPad(false);
    } catch (err) {
      setLinkError(formatActionError(err, 'Could not save your signature. Please try again.'));
    } finally {
      setSigningAsCM(false);
    }
  };

  const handleRemoveSignature = async (signatureField: 'caseManagerSignature' | 'participantSignature') => {
    setRemovingSignature(signatureField);
    setLinkError(null);
    try {
      await onRemoveSignature(signatureField);
    } catch (err) {
      setLinkError(formatActionError(err, 'Could not remove the signature. Please try again.'));
    } finally {
      setRemovingSignature(null);
    }
  };

  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-burnt-peach-500 shrink-0" />
              Share & Sign
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Share a secure link with the participant and collect digital signatures.
            </CardDescription>
          </div>
          {onClose && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 shrink-0 rounded-full text-burnt-peach-600 dark:text-burnt-peach-400 hover:bg-burnt-peach-50 dark:hover:bg-burnt-peach-950/30"
              title="Close Share & Sign"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        {linkError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-300 text-xs font-semibold rounded-xl">
            {linkError}
          </div>
        )}

        {/* Share link section */}
        {!shareToken ? (
          <div className="flex flex-col sm:flex-row sm:items-center py-2 gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-full bg-burnt-peach-50 dark:bg-burnt-peach-900/30 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
              <Link2 className="w-5 h-5 text-burnt-peach-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No participant link yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Generate a secure link to share this case plan with {participant.name}.
              </p>
            </div>
            <Button
              onClick={handleGenerateLink}
              disabled={generatingLink}
              className="bg-burnt-peach-600 dark:bg-burnt-peach-500 text-white font-bold"
            >
              {generatingLink ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
              Generate Secure Link
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                <p className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate">{portalUrl}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="shrink-0 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                title="Copy link"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-burnt-peach-600 dark:text-burnt-peach-400" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSync}
                  disabled={syncingPortal}
                  className="text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  title="Sync latest case plan data to the portal"
                >
                  {syncingPortal ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                  Sync
                </Button>
                {updatedAt && (
                  <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {updatedAt}
                  </span>
                )}
              </div>

              {!confirmRevoke ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmRevoke(true)}
                  className="text-burnt-peach-600 dark:text-burnt-peach-400 hover:bg-burnt-peach-50 dark:hover:bg-burnt-peach-950/30 text-xs font-semibold"
                >
                  <Unlink className="w-3.5 h-3.5 mr-1.5" /> Revoke Link
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Revoke this link?</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRevokeLink}
                    disabled={revokingLink}
                    className="text-burnt-peach-600 dark:text-burnt-peach-400 border-burnt-peach-200 dark:border-burnt-peach-900 hover:bg-burnt-peach-50 dark:hover:bg-burnt-peach-950/30 text-xs font-semibold h-7 px-2"
                  >
                    {revokingLink ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes, Revoke'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmRevoke(false)}
                    className="text-slate-400 text-xs h-7 px-2"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signatures section (only shown when a link exists) */}
        {shareToken && (
          <>
            <div className="border-t border-slate-100 dark:border-slate-800" />

            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Signatures</p>

              {/* Case Manager Signature */}
              {portalDoc?.caseManagerSignature ? (
                <SignatureBadge
                  sig={portalDoc.caseManagerSignature}
                  label={`${userTitle || 'Case Manager'}`}
                  onRemove={() => handleRemoveSignature('caseManagerSignature')}
                  removing={removingSignature === 'caseManagerSignature'}
                />
              ) : (
                <div className="space-y-2.5">
                  <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-500">Your signature is pending</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowSignPad(v => !v)}
                    className="w-full text-burnt-peach-600 dark:text-burnt-peach-400 border-burnt-peach-200 dark:border-burnt-peach-900 hover:bg-burnt-peach-50 dark:hover:bg-burnt-peach-950/30 font-semibold"
                  >
                    <PenLine className="w-4 h-4 mr-2" />
                    Sign as {userTitle || 'Case Manager'}
                    {showSignPad ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                  </Button>
                  {showSignPad && (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50">
                      <SignaturePad onSign={handleSignAsCaseManager} disabled={signingAsCM} />
                    </div>
                  )}
                </div>
              )}

              {/* Participant Signature */}
              {portalDoc?.participantSignature ? (
                <SignatureBadge
                  sig={portalDoc.participantSignature}
                  label="Participant"
                  onRemove={() => handleRemoveSignature('participantSignature')}
                  removing={removingSignature === 'participantSignature'}
                />
              ) : (
                <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Participant has not yet signed &mdash; they sign via their portal link
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
