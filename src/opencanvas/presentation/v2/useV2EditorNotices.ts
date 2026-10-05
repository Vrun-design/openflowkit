import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { runV1Import } from '../../../services/storage/v2/v1Import';
import type { ToastItem } from '../design-system';

// One import run per page load, so one notice per page load, whichever editor mounts first.
let v1NoticeShown = false;

/** Toasts the editor owes on mount: the v1 import outcome, and (dev only) uncaught errors. */
export function useV2EditorNotices(pushToast: (toast: ToastItem) => void): void {
  const navigate = useNavigate();

  // Dev only: an uncaught error is a bug, so it must not fail silently while
  // testing by hand. Production stays quiet (extensions throw into the page too).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const show = (message: string) =>
      pushToast({ id: `dev-error-${Date.now()}`, tone: 'danger', title: 'Uncaught error (dev)', description: message });
    const onError = (event: ErrorEvent) => show(event.message);
    const onRejection = (event: PromiseRejectionEvent) =>
      show(event.reason instanceof Error ? event.reason.message : String(event.reason));
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, [pushToast]);

  // The one notice after v1 diagrams come over (12.4); later boots import nothing and stay quiet.
  useEffect(() => {
    let live = true;
    runV1Import().then(({ imported, failures, firstRun }) => {
      // A failure that repeats on every boot is listed on Home, not toasted again.
      if (!live || v1NoticeShown || (imported.length === 0 && !(firstRun && failures.length))) return;
      v1NoticeShown = true;
      const names = failures.slice(0, 3).map((failure) => `“${failure.name}”`).join(', ');
      pushToast({
        id: 'v1-import', tone: failures.length ? 'warning' : 'success', persistent: failures.length > 0,
        title: imported.length
          ? `Brought over ${imported.length} ${imported.length === 1 ? 'diagram' : 'diagrams'} from the previous editor.`
          : 'Diagrams from the previous editor could not be brought over yet.',
        ...(failures.length ? { description: `Not yet: ${names}${failures.length > 3 ? ` and ${failures.length - 3} more` : ''}. They stay safe in this browser.` } : {}),
        action: { label: 'See all diagrams', onClick: () => navigate('/home') },
      });
    }, () => undefined);
    return () => { live = false; };
  }, [pushToast, navigate]);
}
