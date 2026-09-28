'use client';

import { useState } from 'react';

interface Props {
  images: string[];
  productName: string;
  discount?: number;
}

export function ProductGallery({ images, productName, discount = 0 }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);

  const activeImage = images[activeIdx] || null;

  return (
    <div className="max-w-md mx-auto md:mx-0 w-full">
      {/* Main image */}
      <div
        className={`relative aspect-square rounded-xl overflow-hidden bg-sand border border-line ${
          activeImage
            ? 'cursor-zoom-in hover:shadow-lg transition'
            : ''
        }`}
        onClick={() => activeImage && setPreviewOpen(true)}
      >
        {activeImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeImage}
            alt={productName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted">
            No image
          </div>
        )}
        {discount > 0 && (
          <span className="absolute top-4 left-4 bg-wine text-white text-sm font-semibold px-3 py-1 rounded-full">
            -{discount}% OFF
          </span>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mt-4">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={`aspect-square rounded-lg overflow-hidden bg-sand border-2 transition ${
                activeIdx === i
                  ? 'border-wine ring-2 ring-wine/20'
                  : 'border-line hover:border-wine/50'
              }`}
              aria-label={`View image ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={`${productName} ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen preview modal */}
      {previewOpen && activeImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[100] cursor-zoom-out"
          onClick={() => setPreviewOpen(false)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewOpen(false);
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl transition"
            aria-label="Close"
          >
            ✕
          </button>

          {/* Prev / Next */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIdx((i) => (i - 1 + images.length) % images.length);
                }}
                className="absolute left-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-2xl transition"
                aria-label="Previous"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIdx((i) => (i + 1) % images.length);
                }}
                className="absolute right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-2xl transition"
                aria-label="Next"
              >
                ›
              </button>
            </>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeImage}
            alt={productName}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Counter */}
          {images.length > 1 && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/50 px-3 py-1 rounded-full">
              {activeIdx + 1} / {images.length}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
