import React, { useRef, useEffect, useState } from 'react'; // Import useState
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, UploadCloud, Loader2 } from 'lucide-react';
import { showError } from '@/utils/toast'; // Import showError for client-side validation

interface CustomFileInputProps {
  id: string;
  label: string;
  file?: File | null;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  disabled?: boolean;
  accept?: string;
  isUploading?: boolean;
  previewUrl?: string | null; // This is now expected to be a PUBLIC URL or data:URL
}

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

const CustomFileInput: React.FC<CustomFileInputProps> = ({
  id,
  label,
  file,
  onChange,
  onClear,
  disabled,
  isUploading,
  previewUrl,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [internalPreviewUrl, setInternalPreviewUrl] = useState<string | null>(previewUrl || null);

  useEffect(() => {
    setInternalPreviewUrl(previewUrl || null);
  }, [previewUrl]);

  const handleInternalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0];
      if (!ALLOWED_IMAGE_MIMES.includes(selectedFile.type)) {
        showError("Invalid file type. Only JPEG, PNG, GIF, WEBP, and SVG images are allowed.");
        event.target.value = ''; // Clear the input
        setInternalPreviewUrl(null);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setInternalPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setInternalPreviewUrl(null);
    }
    onChange(event); // Pass the event up to the parent
  };

  const handleButtonClick = () => {
    if (fileInputRef.current && !disabled && !isUploading) {
      fileInputRef.current.click();
    }
  };

  const hasActivePreview = !!internalPreviewUrl && internalPreviewUrl !== "";
  const hasFileOrPreview = !!file || hasActivePreview;

  const buttonText = isUploading
    ? "Uploading..."
    : file
      ? file.name
      : hasActivePreview
        ? "Image Selected"
        : "Choose File";

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleButtonClick}
          disabled={disabled || isUploading}
          className="flex-grow justify-start relative"
        >
          <UploadCloud className="mr-2 h-4 w-4" />
          {buttonText}
          <Input
            id={id}
            type="file"
            accept={ALLOWED_IMAGE_MIMES.join(',')} // Restrict client-side file picker
            onChange={handleInternalChange}
            ref={fileInputRef}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer hidden"
            disabled={disabled || isUploading}
          />
        </Button>
        {hasFileOrPreview && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClear}
            disabled={disabled || isUploading}
            aria-label="Clear selected file"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      {isUploading ? (
        <div className="mt-2 p-4 border border-dashed border-muted-foreground/50 rounded-md flex items-center justify-center text-muted-foreground text-sm">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Uploading...
        </div>
      ) : hasActivePreview ? (
        <div className="mt-2 p-2 border border-border rounded-md flex items-center justify-center bg-muted/20">
          <img src={internalPreviewUrl!} alt="Product Preview" className="max-w-[100px] max-h-[100px] object-contain" />
        </div>
      ) : (
        <div className="mt-2 p-4 border border-dashed border-muted-foreground/50 rounded-md flex items-center justify-center text-muted-foreground text-sm">
          <span>No image selected</span>
        </div>
      )}
    </div>
  );
};

export default CustomFileInput;