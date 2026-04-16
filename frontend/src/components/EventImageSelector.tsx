import { useState, useRef } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface EventImageSelectorProps {
  onImageUploaded: (imageUrl: string, publicId: string) => void;
  currentImageUrl?: string;
  label?: string;
  helpText?: string;
}

interface ImageCategory {
  name: string;
  images: Array<{
    url: string;
    publicId: string;
    name: string;
  }>;
}

// Pre-created event images organized by category
const IMAGE_CATEGORIES: ImageCategory[] = [
  {
    name: 'Birthday',
    images: [
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
        url: 'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=800',
        publicId: 'preset_birthday_cupcakes',
        name: 'Birthday Cupcakes'
      },
      {
        url: 'https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=800',
        publicId: 'preset_birthday_candles',
        name: 'Birthday Candles'
      }
    ]
  },
  {
    name: 'Wedding',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
        publicId: 'preset_wedding_rings',
        name: 'Wedding Rings'
      },
      {
        url: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800',
        publicId: 'preset_wedding_flowers',
        name: 'Wedding Flowers'
      },
      {
        url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800',
        publicId: 'preset_wedding_bouquet',
        name: 'Wedding Bouquet'
      },
      {
        url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800',
        publicId: 'preset_wedding_celebration',
        name: 'Wedding Celebration'
      }
    ]
  },
  {
    name: 'Anniversary',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1522673607212-f2f15e0a71d7?w=800',
        publicId: 'preset_anniversary_roses',
        name: 'Anniversary Roses'
      },
      {
        url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800',
        publicId: 'preset_anniversary_champagne',
        name: 'Anniversary Champagne'
      },
      {
        url: 'https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?w=800',
        publicId: 'preset_anniversary_romantic',
        name: 'Romantic Celebration'
      },
      {
        url: 'https://images.unsplash.com/photo-1470072768013-bf9532177525?w=800',
        publicId: 'preset_anniversary_hearts',
        name: 'Hearts & Love'
      }
    ]
  },
  {
    name: 'Graduation',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1523438097201-512ae7d59c44?w=800',
        publicId: 'preset_graduation_cap',
        name: 'Graduation Cap'
      },
      {
        url: 'https://images.unsplash.com/photo-1627556704283-54b35dc57b7a?w=800',
        publicId: 'preset_graduation_celebration',
        name: 'Graduation Celebration'
      },
      {
        url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800',
        publicId: 'preset_graduation_diploma',
        name: 'Graduation Diploma'
      },
      {
        url: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800',
        publicId: 'preset_graduation_success',
        name: 'Academic Success'
      }
    ]
  },
  {
    name: 'Baby Shower',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800',
        publicId: 'preset_baby_shower',
        name: 'Baby Shower'
      },
      {
        url: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800',
        publicId: 'preset_baby_pink_blue',
        name: 'Baby Celebration'
      },
      {
        url: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=800',
        publicId: 'preset_baby_toys',
        name: 'Baby Toys'
      },
      {
        url: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800',
        publicId: 'preset_baby_party',
        name: 'Baby Party'
      }
    ]
  },
  {
    name: 'Diwali & Festivals',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1605792657660-596af9009e82?w=800',
        publicId: 'preset_diwali_lights',
        name: 'Diwali Lights'
      },
      {
        url: 'https://images.unsplash.com/photo-1478147427282-58a87a120781?w=800',
        publicId: 'preset_diwali_diyas',
        name: 'Diwali Diyas'
      },
      {
        url: 'https://images.unsplash.com/photo-1540575861501-7cf05a4b125a?w=800',
        publicId: 'preset_diwali_rangoli',
        name: 'Diwali Rangoli'
      },
      {
        url: 'https://images.unsplash.com/photo-1482575832494-771f74bf6857?w=800',
        publicId: 'preset_festival_celebration',
        name: 'Festival Celebration'
      }
    ]
  },
  {
    name: 'Retirement',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1504805572947-34fad45aed93?w=800',
        publicId: 'preset_retirement_celebration',
        name: 'Retirement Celebration'
      },
      {
        url: 'https://images.unsplash.com/photo-1533134486753-c833f0ed4866?w=800',
        publicId: 'preset_retirement_cheers',
        name: 'Cheers to Retirement'
      },
      {
        url: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800',
        publicId: 'preset_retirement_journey',
        name: 'New Journey'
      },
      {
        url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800',
        publicId: 'preset_retirement_relaxation',
        name: 'Relaxation Time'
      }
    ]
  },
  {
    name: 'Fundraiser & Charity',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800',
        publicId: 'preset_charity_hands',
        name: 'Helping Hands'
      },
      {
        url: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800',
        publicId: 'preset_charity_community',
        name: 'Community Support'
      },
      {
        url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800',
        publicId: 'preset_charity_giving',
        name: 'Gift of Giving'
      },
      {
        url: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800',
        publicId: 'preset_charity_heart',
        name: 'Heart of Charity'
      }
    ]
  },
  {
    name: 'General Celebration',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
        publicId: 'preset_party_lights',
        name: 'Party Lights'
      },
      {
        url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800',
        publicId: 'preset_celebration_confetti',
        name: 'Celebration Confetti'
      },
      {
        url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800',
        publicId: 'preset_party_balloons',
        name: 'Party Balloons'
      },
      {
        url: 'https://images.unsplash.com/photo-1486711681588-8936ddb2071c?w=800',
        publicId: 'preset_celebration_fireworks',
        name: 'Celebration Fireworks'
      }
    ]
  }
];

const EventImageSelector = ({ onImageUploaded, currentImageUrl, label, helpText }: EventImageSelectorProps) => {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [selectedCategory, setSelectedCategory] = useState<string>(IMAGE_CATEGORIES[0].name);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePresetSelect = (image: { url: string; publicId: string; name: string }) => {
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
        <div>
          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {IMAGE_CATEGORIES.map((category) => (
              <button
                key={category.name}
                type="button"
                onClick={() => setSelectedCategory(category.name)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === category.name
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Images Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {IMAGE_CATEGORIES.find(cat => cat.name === selectedCategory)?.images.map((image) => (
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
