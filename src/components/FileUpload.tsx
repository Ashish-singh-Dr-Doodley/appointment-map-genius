import { useCallback } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  onDataParsed: (file: File) => void;
}

export const FileUpload = ({ onDataParsed }: FileUploadProps) => {
  const handleFileUpload = useCallback((file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return;
    }
    onDataParsed(file);
  }, [onDataParsed]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer bg-card"
    >
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileInput}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Upload Excel File</h3>
            <p className="text-muted-foreground text-sm">
              Drag and drop your Excel file here, or click to browse
            </p>
          </div>
        </div>
      </label>
    </div>
  );
};
