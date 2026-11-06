import React, { useState } from 'react';

/** Product image URL is supplied by the transaction data, never fetched here. */
export default function ProductThumbnail({ imageUrl = null, className = '' }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const showImage = typeof imageUrl === 'string' && imageUrl.trim() && failedUrl !== imageUrl;

  return <span className={`product-thumbnail ${className}`} aria-hidden="true">
    {showImage ? <img
      src={imageUrl}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailedUrl(imageUrl)}
    /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 9 5v8l-9 5-9-5V8Z" />
      <path d="m3 8 9 5 9-5M12 13v8M7.5 5.5l9 5" />
    </svg>}
  </span>;
}
