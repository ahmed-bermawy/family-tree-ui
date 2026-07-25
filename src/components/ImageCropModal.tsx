import { useState, useCallback } from 'react';
import Cropper, { type Area } from 'react-easy-crop';

interface Props {
  imageUrl: string;
  onCrop: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

export default function ImageCropModal({ imageUrl, onCrop, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleCrop = useCallback(async () => {
    if (!croppedAreaPixels) return;
    try {
      const image = new Image();
      // data URLs don't need CORS
      if (!imageUrl.startsWith('data:')) image.crossOrigin = 'anonymous';
      image.src = imageUrl;
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      ctx.drawImage(
        image,
        croppedAreaPixels.x, croppedAreaPixels.y,
        croppedAreaPixels.width, croppedAreaPixels.height,
        0, 0,
        croppedAreaPixels.width, croppedAreaPixels.height,
      );

      canvas.toBlob((blob) => {
        if (blob) onCrop(blob);
        else onCancel();
      }, 'image/jpeg', 0.9);
    } catch {
      onCancel();
    }
  }, [croppedAreaPixels, imageUrl, onCrop, onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/80">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 z-10">
        <button onClick={onCancel} className="text-gray-400 hover:text-white text-sm transition">Cancel</button>
        <h3 className="text-white font-semibold text-sm">Crop Photo</h3>
        <button onClick={handleCrop} className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold transition">Confirm</button>
      </div>

      {/* Cropper */}
      <div className="flex-1 relative">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={true}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      {/* Zoom slider */}
      <div className="px-4 py-4 bg-gray-900 border-t border-gray-800">
        <div className="flex items-center gap-3 max-w-xs mx-auto">
          <span className="text-gray-400 text-xs">−</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-emerald-500"
          />
          <span className="text-gray-400 text-xs">+</span>
        </div>
        <p className="text-gray-500 text-xs text-center mt-2">Drag to adjust, scroll to zoom</p>
      </div>
    </div>
  );
}
