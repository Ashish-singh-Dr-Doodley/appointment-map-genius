import { useCallback } from 'react';
import { Upload } from 'lucide-react';
import { parseExcelFile } from '@/utils/excelParser';
import { Appointment } from '@/types/appointment';
import { toast } from 'sonner';

interface FileUploadProps {
  onDataParsed: (appointments: Appointment[]) => void;
}

export const FileUpload = ({ onDataParsed }: FileUploadProps) => {
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    try {
      toast.loading('Parsing Excel file...');
      const appointments = await parseExcelFile(file);
      const validAppointments = appointments.filter(a => a.latitude && a.longitude);
      
      toast.dismiss();
      toast.success(`Successfully parsed ${validAppointments.length} appointments with coordinates`);
      onDataParsed(appointments);
    } catch (error) {
      toast.dismiss();
      toast.error('Error parsing Excel file. Please check the file format.');
      console.error(error);
    }
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
