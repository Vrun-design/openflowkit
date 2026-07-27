import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { AssetEncodeError, ingestUserMediaFile } from '@/services/storage/assetStore';

export interface ImageUploadChange {
  displayUrl?: string;
  assetId?: string;
}

interface ImageUploadProps {
  imageUrl?: string;
  onChange: (value?: string, meta?: ImageUploadChange) => void;
  kind?: 'image' | 'icon';
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  imageUrl,
  onChange,
  kind = 'image',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow re-selecting the same file later.
    e.target.value = '';
    if (!file) {
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    try {
      const result = await ingestUserMediaFile(file, kind, { fileName: file.name });
      onChange(result.displayUrl, {
        displayUrl: result.displayUrl,
        assetId: result.assetId,
      });
    } catch (error) {
      const message =
        error instanceof AssetEncodeError
          ? error.message
          : 'Failed to process the selected image.';
      setErrorMessage(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3">
        {imageUrl ? (
          <div className="relative group overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-brand-border)]">
            <img src={imageUrl} className="w-full h-32 object-cover opacity-90" alt="attached" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => onChange(undefined, { displayUrl: undefined, assetId: undefined })}
                className="rounded-[var(--radius-sm)] border border-red-500/20 bg-red-500/90 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-500"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-4 py-6 text-sm text-[var(--brand-secondary)] transition-all hover:border-[var(--brand-primary-300)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-primary)] disabled:opacity-60"
          >
            <Upload className="w-5 h-5" />
            <span>{isUploading ? 'Processing…' : 'Click to Upload Image'}</span>
          </button>
        )}

        {errorMessage ? (
          <p className="text-xs text-red-500" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void handleImageUpload(event);
          }}
        />
      </div>
    </div>
  );
};
