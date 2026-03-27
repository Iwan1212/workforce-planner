import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { DialogWrapper } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { importEmployeesCsv } from "@/api/employees";
import type { ImportCsvDialogProps, ImportResult } from "@/types/employee";

function parseCsvPreview(text: string): string[][] {
  const lines = text.split("\n").filter((l) => l.trim());
  return lines.slice(0, 6).map((line) => line.split(",").map((c) => c.trim()));
}

export function ImportCsvDialog({ open, onClose }: ImportCsvDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][] | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const importMutation = useMutation({
    mutationFn: (file: File) => importEmployeesCsv(file),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      if (data.imported > 0) {
        toast.success(`Zaimportowano ${data.imported} pracowników`);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setPreview(parseCsvPreview(text));
    };
    reader.readAsText(file);
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    importMutation.mutate(selectedFile);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  return (
    <DialogWrapper
      open={open}
      onClose={handleClose}
      title="Import pracowników z CSV"
      contentClassName="max-w-lg"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>
            {result ? "Zamknij" : "Anuluj"}
          </Button>
          {!result && (
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || importMutation.isPending}
            >
              <Upload className="mr-2 h-4 w-4" />
              {importMutation.isPending ? "Importowanie..." : "Importuj"}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Wymagane kolumny: <code>first_name</code>, <code>last_name</code>,{" "}
            <code>team</code> (opcjonalnie). Maks. 500 wierszy, 1 MB.
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted"
            />
          </div>

          {/* Preview table */}
          {preview && preview.length > 0 && !result && (
            <div className="rounded-md border">
              <div className="max-h-48 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {preview[0].map((header, i) => (
                        <th key={i} className="px-3 py-1.5 text-left font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(1).map((row, ri) => (
                      <tr key={ri} className="border-b last:border-0">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-1.5">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t px-3 py-1.5 text-xs text-muted-foreground">
                Podgląd pierwszych {Math.min(preview.length - 1, 5)} wierszy
              </div>
            </div>
          )}

          {/* Result summary */}
          {result && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex gap-4 text-sm">
                <span className="text-green-600 font-medium">
                  Zaimportowano: {result.imported}
                </span>
                {result.skipped > 0 && (
                  <span className="text-yellow-600 font-medium">
                    Pominięto: {result.skipped}
                  </span>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="max-h-32 overflow-auto">
                  <ul className="space-y-1 text-xs text-destructive">
                    {result.errors.map((err, i) => (
                      <li key={i}>
                        Wiersz {err.row}: {err.detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
    </DialogWrapper>
  );
}
