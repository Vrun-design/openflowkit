import React, { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { lastDocumentId, mintV2Id } from '@/opencanvas/presentation/v2/v2Document';
import { runV1Import } from '@/services/storage/v2/v1Import';

const HomePage = lazy(async () => {
  const module = await import('@/opencanvas/presentation/v2/V2HomePage');
  return { default: module.V2HomePage };
});

const EditorPage = lazy(async () => {
  const module = await import('@/opencanvas/presentation/v2/V2EditorPage');
  return { default: module.V2EditorPage };
});

// A first visit lands on the newest diagram brought over from v1, if the import finishes
// within 2 s; otherwise a new document, and the import carries on in the background.
const FIRST_VISIT_WAIT_MS = 2000;

function HomeDocument(): React.JSX.Element | null {
  const [target, setTarget] = useState(lastDocumentId);
  useEffect(() => {
    if (target) return undefined;
    let live = true;
    const fresh = mintV2Id('doc');
    void Promise.race([
      runV1Import().then((report) => report.imported[0] ?? fresh, () => fresh),
      new Promise<string>((resolve) => setTimeout(() => resolve(fresh), FIRST_VISIT_WAIT_MS)),
    ]).then((id) => { if (live) setTarget(id); });
    return () => { live = false; };
  }, [target]);
  return target ? <Navigate to={`/d/${target}`} replace /> : null;
}

function LegacyV2Redirect(): React.JSX.Element {
  const { id } = useParams();
  return <Navigate to={`/d/${id}`} replace />;
}

export default function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/home" element={<HomePage />} />
          <Route path="/d/:id" element={<EditorPage />} />
          <Route path="/v2/:id" element={<LegacyV2Redirect />} />
          <Route path="*" element={<HomeDocument />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
