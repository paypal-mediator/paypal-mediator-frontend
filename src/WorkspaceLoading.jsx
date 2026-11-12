import React from 'react';

export default function WorkspaceLoading({ fullscreen = false }) {
  return <div className={`signed-out workspace-loading ${fullscreen ? 'full-screen-loading' : ''}`} role="status" aria-live="polite">Loading workspace…</div>;
}
