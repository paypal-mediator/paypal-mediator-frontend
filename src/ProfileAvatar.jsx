import React from 'react';

// User Round geometry from Lucide. See THIRD_PARTY_NOTICES.md.
export default function ProfileAvatar({ small = false }) {
  return <span className={`avatar profile-avatar${small ? ' small' : ''}`} aria-hidden="true">
    <svg className="profile-person-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  </span>;
}
