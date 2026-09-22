/**
 * Image Utilities for Client-side Compression and Processing
 * Automatically resizes and compresses images to prevent localStorage/Firestore quota limits.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

/**
 * Compresses an image File using an offscreen HTML Canvas
 * Returns a lightweight base64 data URL string (typically 30KB - 80KB)
 */
export const compressImageFile = (
  file: File,
  options: CompressionOptions = {}
): Promise<{ dataUrl: string; sizeKb: number; width: number; height: number }> => {
  const {
    maxWidth = 1000,
    maxHeight = 1000,
    quality = 0.82,
    mimeType = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    // Basic validation
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image data.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio bounded by max dimensions
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const fallbackData = e.target?.result as string;
          resolve({
            dataUrl: fallbackData,
            sizeKb: Math.round(file.size / 1024),
            width: img.width,
            height: img.height
          });
          return;
        }

        // Draw with white background for transparency conversion
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL(mimeType, quality);
        // Estimate size from base64 string length
        const sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);

        resolve({
          dataUrl,
          sizeKb,
          width,
          height
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Curated high-resolution stock photos for pharmacy and surgical e-commerce
 */
export const PHARMA_STOCK_PRESETS = [
  {
    title: 'Tablets & Blister Pack',
    category: 'Medicines',
    url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
    tags: ['Tablets', 'Antibiotics', 'Painkiller', 'Strip']
  },
  {
    title: 'Syrup & Suspension Bottle',
    category: 'Syrups',
    url: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=600&auto=format&fit=crop&q=80',
    tags: ['Cough Syrup', 'Suspension', 'Pediatric', 'Liquid']
  },
  {
    title: 'Surgical Syringe & Needles',
    category: 'Surgical Disposables',
    url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&auto=format&fit=crop&q=80',
    tags: ['Syringe', 'Injection', 'Disposable', 'Hospital']
  },
  {
    title: 'Capsules & Multivitamins',
    category: 'Supplements',
    url: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&auto=format&fit=crop&q=80',
    tags: ['Capsules', 'Vitamins', 'Minerals', 'Immunity']
  },
  {
    title: 'Surgical Examination Gloves',
    category: 'Surgical Disposables',
    url: 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=600&auto=format&fit=crop&q=80',
    tags: ['Latex Gloves', 'Nitrile', 'Surgical', 'Protection']
  },
  {
    title: 'Topical Ointment / Gel',
    category: 'Creams',
    url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80',
    tags: ['Cream', 'Ointment', 'Skin Care', 'Antiseptic']
  },
  {
    title: 'Cotton Gauze & Bandages',
    category: 'Surgical Items',
    url: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=600&auto=format&fit=crop&q=80',
    tags: ['Bandage', 'Gauze', 'Wound Care', 'Sterile']
  },
  {
    title: 'Eye / Ear Sterile Drops',
    category: 'Drops',
    url: 'https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=600&auto=format&fit=crop&q=80',
    tags: ['Eye Drops', 'Ear Drops', 'Sterile', 'Solution']
  },
  {
    title: 'Blood Pressure / Diagnostic Monitor',
    category: 'Medical Devices',
    url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80',
    tags: ['BP Monitor', 'Stethoscope', 'Diagnostics', 'Device']
  },
  {
    title: 'First Aid Emergency Care',
    category: 'Emergency',
    url: 'https://images.unsplash.com/photo-1603555501671-8f96b3fce8b4?w=600&auto=format&fit=crop&q=80',
    tags: ['First Aid', 'Antiseptic', 'Emergency', 'Sanitizer']
  }
];
