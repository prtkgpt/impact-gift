import { useState, useRef } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export interface EventPhoto {
  id?: number;
  photo_url: string;
  photo_public_id: string;
  category?: string;
  caption?: string;
  display_order?: number;
}

interface EventPhotosUploaderProps {
  eventId?: number;
  photos: EventPhoto[];
  onChange: (photos: EventPhoto[]) => void;
  category?: string;
  maxPhotos?: number;
  label?: string;
  helpText?: string;
}

const EventPhotosUploader = ({
  eventId,
  photos,
  onChange,
  category = 'dress_code',
  maxPhotos = 6,
  label = 'Event Photos',
  helpText = 'Upload photos to help guests prepare (e.g., dress code examples, venue photos)'
}: EventPhotosUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Check if adding these files would exceed max photos
    if (photos.length + files.length > maxPhotos) {
      toast.error(`You can only upload up to ${maxPhotos} photos`);
      return;
    }

    // Validate files
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 5MB`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Upload files
    try {
      setUploading(true);
      const formData = new FormData();
      validFiles.forEach(file => {
        formData.append('images', file);
      });

      const response = await api.post('/event-photos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const uploadedPhotos = response.data.photos.map((photo: any) => ({
          photo_url: photo.imageUrl,
          photo_public_id: photo.publicId,
          category,
          caption: '',
        }));

        onChange([...photos, ...uploadedPhotos]);
        toast.success(`${validFiles.length} photo(s) uploaded successfully!`);
      }
    } catch (error: unknown) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.error || 'Failed to upload photos');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async (index: number) => {
    const photo = photos[index];

    // If photo has an ID, it's saved in database - delete from server
    if (photo.id && eventId) {
      try {
        await api.delete(`/event-photos/${photo.id}`);
        toast.success('Photo deleted successfully');
      } catch (error: unknown) {
        console.error('Delete error:', error);
        toast.error('Failed to delete photo');
        return;
      }
    }

    // Remove from local state
    const newPhotos = photos.filter((_, i) => i !== index);
    onChange(newPhotos);
  };

  const handleCaptionChange = (index: number, caption: string) => {
    const newPhotos = [...photos];
    newPhotos[index] = { ...newPhotos[index], caption };
    onChange(newPhotos);
  };

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        {helpText && (
          <p className="text-xs text-gray-500 mb-3">{helpText}</p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {photos.map((photo, index) => (
          <div key={index} className="relative group">
            <img
              src={photo.photo_url}
              alt={photo.caption || `Photo ${index + 1}`}
              className="w-full h-40 object-cover rounded-lg border-2 border-gray-200"
            />
            <button
              type="button"
              onClick={() => handleRemovePhoto(index)}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
              title="Remove photo"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <input
              type="text"
              placeholder="Add caption (optional)"
              value={photo.caption || ''}
              onChange={(e) => handleCaptionChange(index, e.target.value)}
              className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-b-lg placeholder-gray-300 focus:outline-none focus:bg-opacity-90"
            />
          </div>
        ))}

        {canAddMore && (
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all flex flex-col items-center justify-center gap-2 group"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                  <span className="text-xs text-gray-600">Uploading...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-8 h-8 text-gray-400 group-hover:text-primary-500 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <div className="text-center px-2">
                    <p className="text-xs font-medium text-gray-700 group-hover:text-primary-600">
                      Add Photos
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {photos.length}/{maxPhotos}
                    </p>
                  </div>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {photos.length >= maxPhotos && (
        <p className="text-xs text-gray-500 italic">
          Maximum of {maxPhotos} photos reached
        </p>
      )}
    </div>
  );
};

export default EventPhotosUploader;
