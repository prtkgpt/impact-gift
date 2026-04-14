import { useState, useRef } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface EventImageSelectorProps {
  onImageUploaded: (imageUrl: string, publicId: string) => void;
  currentImageUrl?: string;
  label?: string;
  helpText?: string;
}

// Pre-created event images
const PRE_CREATED_IMAGES = [
  {
    url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800',
    publicId: 'preset_birthday_balloons',
    name: 'Birthday Balloons'
  },
  {
    url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800',
    publicId: 'preset_birthday_cake',
    name: 'Birthday Cake'
  },
  {
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
    publicId: 'preset_wedding_rings',
    name: 'Wedding Celebration'
  },
  {
    url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800',
    publicId: 'preset_celebration_confetti',
    name: 'Celebration Confetti'
  },
  {
    url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
    publicId: 'preset_party_lights',
    name: 'Party Lights'
  },
  {
    url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800',
    publicId: 'preset_anniversary',
    name: 'Anniversary'
  },
  {
    url: 'https://images.unsplash.com/photo-1523438097201-512ae7d59c44?w=800',
    publicId: 'preset_graduation',
    name: 'Graduation'
  },
  {
    url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800',
    publicId: 'preset_baby_shower',
    name: 'Baby Shower'
  }
];

const EventImageSelector = ({ onImageUploaded, currentImageUrl, label, helpText }: EventImageSelectorProps) => {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePresetSelect = (image: typeof PRE_CREATED_IMAGES[0]) => {
    setPreview(image.url);
    setSelectedPresetId(image.publicId);
    onImageUploaded(image.url, image.publicId);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/event-images/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { url, publicId } = response.data;
      onImageUploaded(url, publicId);
      setSelectedPresetId(null);
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreview(null);
    setSelectedPresetId(null);
    onImageUploaded('', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        {label || 'Event Image (Optional)'}
      </label>
      {helpText && <p className="text-xs text-gray-500 mb-3">{helpText}</p>}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('library')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'library'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Choose from Library
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'upload'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Upload Your Own
        </button>
      </div>

      {/* Library Tab */}
      {activeTab === 'library' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PRE_CREATED_IMAGES.map((image) => (
            <button
              key={image.publicId}
              type="button"
              onClick={() => handlePresetSelect(image)}
              className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                selectedPresetId === image.publicId
                  ? 'border-primary-600 ring-2 ring-primary-200'
                  : 'border-gray-200 hover:border-primary-300'
              }`}
            >
              <img
                src={image.url}
                alt={image.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-white text-xs font-medium truncate">{image.name}</p>
              </div>
              {selectedPresetId === image.publicId && (
                <div className="absolute top-2 right-2 bg-primary-600 text-white rounded-full p-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div>
          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-400 transition-colors"
            >
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">Click to upload an image</p>
              <p className="mt-1 text-xs text-gray-500">PNG, JPG up to 5MB</p>
            </div>
          ) : (
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-64 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {uploading && (
            <div className="mt-4 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              <p className="text-sm text-gray-600 mt-2">Uploading...</p>
            </div>
          )}
        </div>
      )}

      {/* Selected Image Preview (for library tab) */}
      {activeTab === 'library' && preview && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Selected Image:</p>
          <div className="relative w-full h-48">
            <img
              src={preview}
              alt="Selected"
              className="w-full h-full object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventImageSelector;
