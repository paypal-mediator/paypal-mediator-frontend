import React from 'react';
export default function RemoteState({ resource, children }) {
  if (resource.loading) return <div className="card remote-state" role="status">Loading…</div>;
  const error = resource.error && <div className="card remote-state" role="alert"><p>{resource.error.message}</p>{resource.error.requestId && <small>Request ID: {resource.error.requestId}</small>}<button className="button secondary" onClick={resource.reload}>Try again</button></div>;
  if (error && resource.data === null) return error;
  return <>{error}{children(resource.data)}</>;
}
