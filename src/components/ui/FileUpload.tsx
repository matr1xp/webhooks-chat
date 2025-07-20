'use client';

import { useState, useRef, DragEvent } from 'react';
import { Upload, X, File, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number; // in bytes
  className?: string;
  disabled?: boolean;
}

export function FileUpload({
  onFileSelect,
  accept = "image/*,.pdf,.doc,.docx,.txt,.csv",
  maxSize = 10 * 1024 * 1024, // 10MB default
  className,
  disabled = false,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    setError(null);

    if (file.size > maxSize) {
      setError(`File too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(1)}MB`);
      return false;
    }

    // Basic file type validation
    const allowedTypes = accept.split(',').map(type => type.trim());
    const isValidType = allowedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      if (type.includes('/*')) {
        const baseType = type.split('/')[0];
        return file.type.startsWith(baseType + '/');
      }
      return file.type === type;
    });

    if (!isValidType) {
      setError('File type not supported');
      return false;
    }

    return true;
  };

  const handleFileSelect = (file: File) => {
    if (validateFile(file)) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <Image className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  return (
    <div className={cn('relative', className)}>
      {/* Drag and Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
          isDragOver && !disabled
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          disabled && 'opacity-50 cursor-not-allowed',
          'min-h-[120px] flex flex-col items-center justify-center space-y-2'
        )}
      >
        <Upload 
          className={cn(
            'w-8 h-8',
            isDragOver && !disabled ? 'text-primary' : 'text-muted-foreground'
          )}
          aria-label="Upload icon"
        />
        
        <div className="text-sm">
          <p className="font-medium">
            {isDragOver ? 'Drop file here' : 'Click to upload or drag and drop'}
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            Supports images, documents up to {(maxSize / 1024 / 1024).toFixed(1)}MB
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handleInputChange}
        disabled={disabled}
      />

      {/* Error message */}
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}