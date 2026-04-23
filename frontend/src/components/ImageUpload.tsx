import { useState, useRef } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { isAxiosError } from '../utils/errors';

interface ImageUploadProps {
  onImageUploaded: (imageUrl: string, publicId: string) => void;
  currentImageUrl?: string;
  label?: string;
  helpText?: string;
}

const ImageUpload = ({ onImageUploaded, currentImageUrl, label, helpText }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      if (response.data.success) {
        onImageUploaded(response.data.imageUrl, response.data.publicId);
        toast.success('Image uploaded successfully!');
      }
    } catch (error: unknown) {
      console.error('Upload error:', error);
      const data = isAxiosError(error) ? (error.response?.data as Record<string, unknown> | undefined) : undefined;
      const errorMsg = (data?.error as string) || 'Failed to upload image';
      toast.error(errorMsg);
      setPreview(currentImageUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onImageUploaded('', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {label || 'Event Image (Optional)'}
      </label>
      {helpText && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}

      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Event preview"
            className="w-full h-64 object-cover rounded-xl border-2 border-gray-200"
          />
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 text-sm font-medium"
              disabled={uploading}
            >
              Change
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="px-4 py-2 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-red-50 hover:border-red-300 hover:text-red-600 text-sm font-medium"
              disabled={uploading}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full h-64 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all flex flex-col items-center justify-center gap-3 group"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                <span className="text-sm text-gray-600">Uploading...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-12 h-12 text-gray-400 group-hover:text-primary-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-primary-600">
                    Click to upload an image
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    JPG, PNG, GIF up to 5MB
                  </p>
                </div>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
