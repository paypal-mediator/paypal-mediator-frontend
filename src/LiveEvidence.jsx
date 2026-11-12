import React, { useState } from 'react';
import { useRemote } from './lib/useRemote';
import { evidenceKey } from './lib/workspace-data';
import { evidenceUploadBody } from './lib/live';
import { evidenceSnapshots } from './lib/evidence-snapshots';
import RemoteState from './RemoteState';
import EvidenceUpload from './EvidenceUpload';
import EvidenceScreen from './EvidenceScreen';
import { label } from './lib/format';
export default function LiveEvidence({ api, transactionId, admin }) {
  const resource = useRemote(signal => Promise.all([api.resources.load(`transaction:${transactionId}`, signal => api.transaction(transactionId, signal)), api.evidence(transactionId, signal)]), [api, transactionId], { store: api.resources, key: evidenceKey(transactionId) });
  const [error, setError] = useState('');
  const download = async item => {
    setError('');
    try {
      const blob = await api.downloadEvidence(transactionId, item.id);
      const url = URL.createObjectURL(blob), anchor = document.createElement('a');
      anchor.href = url; anchor.download = item.content.fileName; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) { setError(failure.message); }
  };
  const upload = async file => { await api.uploadEvidence(transactionId, await evidenceUploadBody(file)); await resource.reload(); };
  return <>{error && <p role="alert">{error}</p>}<RemoteState resource={resource}>{([transaction, dossier]) => <EvidenceScreen
    key={`${transactionId}:${dossier.revision}`} transaction={transaction} snapshots={evidenceSnapshots(transaction, dossier)}
    renderFiles={({ check, historical }) => <EvidenceUpload category={label(check.code)} readOnly={!admin || historical} accept="application/pdf,image/png,image/jpeg" onUpload={upload} />}
    renderRecord={({ records }) => records.map(item => <details className="live-original" key={item.id}><summary>Original record · Version {item.version}</summary><pre>{JSON.stringify(item.content, null, 2)}</pre></details>)}
    renderAdditional={({ snapshot, historical, query }) => {
      const documents = snapshot.items.filter(item => item.type === 'DOCUMENT' && `${item.content.fileName} ${item.sourceSystem}`.toLowerCase().includes(query.toLowerCase()));
      return <section className="card evidence-split-card live-upload-card"><div className="evidence-current"><h2>Additional evidence</h2><p>PDF, PNG, or JPEG · up to 512 KB.</p>{documents.map(item => <div className="evidence-document" key={item.id}><span>{item.content.fileName}</span><button className="text-button" onClick={() => download(item)}>Download original</button></div>)}</div><div className="evidence-files"><EvidenceUpload category="Supporting evidence" readOnly={!admin || historical} accept="application/pdf,image/png,image/jpeg" onUpload={upload} /></div></section>;
    }}
  />}</RemoteState></>;
}
