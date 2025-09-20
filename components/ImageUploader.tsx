
import React, { useState, useRef } from 'react';
import type { ImageData } from '../types';
import { fileToBase64 } from '../services/geminiService';

interface ImageUploaderProps {
  label: string;
  onImageUpload: (imageData: ImageData | null) => void;
  id: string;
}

const UploadIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);


const ImageUploader: React.FC<ImageUploaderProps> = ({ label, onImageUpload, id }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      const imageData = await fileToBase64(file);
      onImageUpload(imageData);
    } else {
      setPreview(null);
      onImageUpload(null);
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
       if (fileInputRef.current) {
        fileInputRef.current.files = event.dataTransfer.files;
       }
       setPreview(URL.createObjectURL(file));
       const imageData = await fileToBase64(file);
       onImageUpload(imageData);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <label
        htmlFor={id}
        className="relative cursor-pointer bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg flex justify-center items-center w-full h-64 hover:border-indigo-500 transition-colors duration-300"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="object-contain h-full w-full rounded-lg" />
        ) : (
          <div className="text-center p-4">
            <UploadIcon />
            <p className="mt-2 text-sm text-gray-400">
              <span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
          </div>
        )}
      </label>
      <input
        id={id}
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept="image/*"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default ImageUploader;
