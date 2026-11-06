import React, { useRef, useState } from 'react';

export default function EvidenceUpload({ category }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  return <div className="evidence-manual-upload">
    <input ref={inputRef} className="evidence-file-input" type="file" multiple accept="image/*,.pdf,.txt,.csv,.json" aria-label={`Upload ${category.toLowerCase()}`} tabIndex={-1} onChange={event => {
      const selected = Array.from(event.target.files);
      setFiles(current => [...current, ...selected.filter(file => !current.some(existing => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified))]);
      event.target.value = '';
    }} />
    <button type="button" className="button secondary evidence-upload-button" onClick={() => inputRef.current?.click()}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></svg>Upload evidence</button>
    {files.length > 0 && <ul className="evidence-selected-files" aria-live="polite">{files.map((file, index) => <li key={`${file.name}-${file.lastModified}`}><span><strong>{file.name}</strong><small>Selected · {Math.max(1, Math.ceil(file.size / 1024))} KB</small></span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles(current => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></li>)}</ul>}
  </div>;
}
