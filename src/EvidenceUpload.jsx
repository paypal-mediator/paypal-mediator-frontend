import React, { useRef, useState } from 'react';

export default function EvidenceUpload({ category, readOnly = false }) {
  const inputRef = useRef(null);
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const addFiles = incoming => setFiles(current => {
    const combined = [...current];
    for (const file of incoming) if (!combined.some(existing => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified)) combined.push(file);
    return combined;
  });
  return <div className={`evidence-folder ${dragging ? 'is-dragging' : ''} ${readOnly ? 'is-readonly' : ''}`} onDragEnter={event => {
    event.preventDefault(); if (readOnly) return; depth.current++; setDragging(true);
  }} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = readOnly ? 'none' : 'copy'; }} onDragLeave={event => {
    event.preventDefault(); depth.current = Math.max(0, depth.current - 1); if (!depth.current) setDragging(false);
  }} onDrop={event => {
    event.preventDefault(); depth.current = 0; setDragging(false); if (!readOnly) addFiles(Array.from(event.dataTransfer.files));
  }}>
    <input ref={inputRef} className="evidence-file-input" type="file" multiple aria-label={`Upload ${category.toLowerCase()}`} tabIndex={-1} disabled={readOnly} onChange={event => { addFiles(Array.from(event.target.files)); event.target.value = ''; }} />
    <button type="button" className="evidence-folder-picker" disabled={readOnly} aria-label={`Add files to ${category.toLowerCase()}`} onClick={() => inputRef.current?.click()}>
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 15V11a3 3 0 0 1 3-3h11l5 6h16a3 3 0 0 1 3 3v20a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V15Z" /><path d="M5 19h38M24 34V24m-4 4 4-4 4 4" /></svg>
      <strong>{readOnly ? 'Files at this version' : dragging ? 'Drop files here' : 'Drop evidence here'}</strong><span>{readOnly ? 'Read only' : 'or click to browse'}</span>
    </button>
    {!readOnly && files.length > 0 && <ul className="evidence-selected-files" aria-live="polite">{files.map((file, index) => <li key={`${file.name}-${file.lastModified}`}><span><strong>{file.name}</strong><small>Selected · {Math.max(1, Math.ceil(file.size / 1024))} KB</small></span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles(current => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></li>)}</ul>}
  </div>;
}
