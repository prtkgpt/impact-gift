import { useState } from 'react';

export interface EventPhoto {
  id?: number;
  photo_url: string;
  photo_public_id?: string;
  category?: string;
  caption?: string;
  display_order?: number;
}

interface EventPhotosGalleryProps {
  photos: EventPhoto[];
  title?: string;
  category?: string;
}

const EventPhotosGallery = ({
  photos,
  title = 'Photos',
  category
}: EventPhotosGalleryProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Filter photos by category if specified
  const filteredPhotos = category
    ? photos.filter(p => p.category === category)
    : photos;

  if (filteredPhotos.length === 0) {
    return null;
  }

  const openLightbox = (index: number) => {
    setCurrentPhotoIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const goToPrevious = () => {
    setCurrentPhotoIndex((prev) =>
      prev === 0 ? filteredPhotos.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    setCurrentPhotoIndex((prev) =>
      prev === filteredPhotos.length - 1 ? 0 : prev + 1
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
  };

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {filteredPhotos.map((photo, index) => (
            <button
              key={photo.id || index}
              type="button"
              onClick={() => openLightbox(index)}
              className="relative group overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <img
                src={photo.photo_url}
                alt={photo.caption || `Photo ${index + 1}`}
                className="w-full h-32 sm:h-40 object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs line-clamp-2">{photo.caption}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 z-10"
            aria-label="Close lightbox"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Previous button */}
          {filteredPhotos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className="absolute left-4 text-white hover:text-gray-300 p-2 z-10"
              aria-label="Previous photo"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Next button */}
          {filteredPhotos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-4 text-white hover:text-gray-300 p-2 z-10"
              aria-label="Next photo"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Photo */}
          <div
            className="max-w-7xl max-h-screen p-4 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={filteredPhotos[currentPhotoIndex].photo_url}
              alt={filteredPhotos[currentPhotoIndex].caption || `Photo ${currentPhotoIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain mx-auto rounded-lg"
            />
            {filteredPhotos[currentPhotoIndex].caption && (
              <p className="text-white text-center mt-4 text-sm sm:text-base">
                {filteredPhotos[currentPhotoIndex].caption}
              </p>
            )}
            {filteredPhotos.length > 1 && (
              <p className="text-white text-center mt-2 text-sm opacity-75">
                {currentPhotoIndex + 1} / {filteredPhotos.length}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default EventPhotosGallery;
