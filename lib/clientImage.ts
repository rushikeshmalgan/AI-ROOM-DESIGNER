// Pure sizing decision, kept separate from the canvas/DOM work below so
// it can be unit tested without a browser environment.
export function computeResizeDimensions(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number; needsResize: boolean } {
  const longestSide = Math.max(width, height);
  if (longestSide <= maxDimension) {
    return { width, height, needsResize: false };
  }
  const scale = maxDimension / longestSide;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
    needsResize: true,
  };
}

export interface ResizeImageOptions {
  maxDimension?: number;
  quality?: number;
}

// Downscales an oversized room photo client-side before it goes over
// the wire — a 10MB phone photo has no benefit to the model at full
// resolution and costs real upload time, memory, and Cloudinary
// bandwidth for nothing. Falls back to the original file on any
// failure (unsupported format, canvas error) rather than blocking the
// upload — this is an optimization, not a requirement.
export async function resizeImageIfNeeded(
  file: File,
  { maxDimension = 2000, quality = 0.85 }: ResizeImageOptions = {}
): Promise<File> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file;
  }

  try {
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await loadImage(objectUrl);
      const { width, height, needsResize } = computeResizeDimensions(
        image.naturalWidth,
        image.naturalHeight,
        maxDimension
      );

      if (!needsResize) {
        return file;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(image, 0, 0, width, height);

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality)
      );
      if (!blob) return file;

      const resizedName = file.name.replace(/\.\w+$/, '') + '.jpg';
      return new File([blob], resizedName, { type: 'image/jpeg' });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch (err) {
    console.error('Client-side image resize failed, uploading original:', err);
    return file;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
