import React, { useRef } from 'react';
import { Image as ImageIcon, Upload } from 'lucide-react';

interface ImageUploadProps {
    imageUrl?: string;
    onChange: (url?: string) => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ imageUrl, onChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onChange(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-3">

            <div className="flex flex-col gap-3">

                {imageUrl ? (
                    <div className="relative group rounded-lg overflow-hidden border border-slate-200">
                        <img src={imageUrl} className="w-full h-32 object-cover opacity-90" alt="attached" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => onChange(undefined)}
                                className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-6 border-2 border-dashed border-slate-300 rounded-xl hover:bg-slate-50 hover:border-indigo-400 hover:text-indigo-600 transition-all text-sm text-slate-500 flex flex-col items-center gap-2"
                    >
                        <Upload className="w-5 h-5" />
                        <span>Click to Upload Image</span>
                    </button>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                />
            </div>
        </div>
    );
};
