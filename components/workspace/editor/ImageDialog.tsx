"use client";

import React, { useRef, useState, useCallback } from "react";

interface ImageDialogProps {
  open: boolean;
  onClose: () => void;
  onInsert: (bytes: Uint8Array, mimeType: string) => void;
}

export function ImageDialog({ open, onClose, onInsert }: ImageDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBytes, setImageBytes] = useState<Uint8Array | null>(null);
  const [mimeType, setMimeType] = useState("image/png");

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) return;

      const bytes = new Uint8Array(await file.arrayBuffer());
      setImageBytes(bytes);
      setMimeType(file.type);
      setPreview(URL.createObjectURL(file));
    },
    []
  );

  const handleInsert = () => {
    if (imageBytes) {
      onInsert(imageBytes, mimeType);
      handleClose();
    }
  };

  const handleClose = () => {
    setPreview(null);
    setImageBytes(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[400px] max-w-[90vw]">
        <h3 className="text-lg font-semibold mb-4">Insert Image</h3>
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center mb-4">
          {preview ? (
            <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded" />
          ) : (
            <div
              onClick={() => inputRef.current?.click()}
              className="cursor-pointer text-muted-foreground"
            >
              <p className="text-sm mb-2">Click to select an image</p>
              <p className="text-xs">PNG, JPG, or GIF</p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        {preview && (
          <button
            onClick={() => { setPreview(null); setImageBytes(null); }}
            className="text-xs text-muted-foreground hover:text-foreground mb-4"
          >
            Choose different image
          </button>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={handleClose} className="px-4 py-2 text-sm rounded-lg hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={!imageBytes}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}
