import React from 'react';

export default function WorkspaceLoading({ fullscreen = false }) {
  return <div className={`signed-out workspace-loading ${fullscreen ? 'full-screen-loading' : ''}`} role="status" aria-label="Loading workspaces" aria-live="polite"><span className="workspace-loading-label">Loading workspaces <span className="workspace-loading-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></span></div>;
}
