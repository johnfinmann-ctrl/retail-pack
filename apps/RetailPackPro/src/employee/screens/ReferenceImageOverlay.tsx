/**
 * Fuldskærms referencebillede-visning, tilgængelig fra Packaging- og
 * Pallet-skærmene (PRS §39 wireframe "Referencebillede").
 */
import { useState } from 'react';

import type { ReferenceImage } from '../../data/types';

export function ReferenceImageOverlay({ images }: { images: ReferenceImage[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpenIndex(0)}
        style={{ background: 'none', border: 'none', color: '#1a73e8', cursor: 'pointer', fontSize: 14 }}
      >
        🖼 {images.length} referencebillede{images.length > 1 ? 'r' : ''}
      </button>

      {openIndex !== null && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <button
            onClick={() => setOpenIndex(null)}
            style={{ position: 'absolute', top: 16, right: 16, color: '#fff', background: 'none', border: 'none', fontSize: 24 }}
          >
            ✕
          </button>
          <img
            src={images[openIndex]?.url}
            alt={images[openIndex]?.caption ?? ''}
            style={{ maxWidth: '90%', maxHeight: '80%', objectFit: 'contain' }}
          />
          {images[openIndex]?.caption && <p style={{ color: '#fff', marginTop: 12 }}>{images[openIndex]?.caption}</p>}
          {images.length > 1 && (
            <div style={{ marginTop: 16, display: 'flex', gap: 16 }}>
              <button
                onClick={() => setOpenIndex((i) => (i! > 0 ? i! - 1 : images.length - 1))}
                style={{ color: '#fff', background: 'none', border: 'none', fontSize: 24 }}
              >
                ←
              </button>
              <button
                onClick={() => setOpenIndex((i) => (i! < images.length - 1 ? i! + 1 : 0))}
                style={{ color: '#fff', background: 'none', border: 'none', fontSize: 24 }}
              >
                →
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
