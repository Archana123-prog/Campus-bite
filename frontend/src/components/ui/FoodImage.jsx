import React, { useState } from 'react';
import { FALLBACK_EMOJI } from '../../utils/constants';

/** Image with a graceful fallback so a broken URL never leaves a hole in the layout. */
export default function FoodImage({ src, alt, className = '', draggable = false }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-gradient-to-br from-brand-100 to-brand-300 text-5xl dark:from-ink-800 dark:to-ink-700 ${className}`}
      >
        {FALLBACK_EMOJI}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      draggable={draggable}
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
