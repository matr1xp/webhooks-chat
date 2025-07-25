'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
      style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      <div className={cn(
        'rounded-lg shadow-lg border w-full max-h-[90vh] overflow-auto relative',
        !className?.includes('max-w-') && 'max-w-md',
        className
      )}
      style={{ 
        backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        borderColor: document.documentElement.classList.contains('dark') ? '#374151' : '#e2e8f0'
      }}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-4 border-b" 
               style={{ 
                 backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
                 borderColor: document.documentElement.classList.contains('dark') ? '#374151' : '#e2e8f0'
               }}>
            <h2 className="text-lg font-semibold" 
                style={{ color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#111827' }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              style={{ color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280' }}
              className="hover:opacity-80 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-4" 
             style={{ backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff' }}>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}