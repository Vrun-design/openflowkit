import React, { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { mintV2Id } from '@/opencanvas/presentation/v2/v2Document';

const EditorPage = lazy(async () => {
  const module = await import('@/opencanvas/presentation/v2/V2EditorPage');
  return { default: module.V2EditorPage };
});

function NewDocument(): React.JSX.Element {
  return <Navigate to={`/d/${mintV2Id('doc')}`} replace />;
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
          <Route path="/d/:id" element={<EditorPage />} />
          <Route path="/v2/:id" element={<LegacyV2Redirect />} />
          <Route path="*" element={<NewDocument />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
