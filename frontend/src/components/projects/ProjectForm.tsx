import { type FormEvent, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HexColorPicker } from "react-colorful";
import { Pencil, Plus } from "lucide-react";
import type { Project } from "@/api/projects";

const COLOR_PALETTE = [
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#84CC16",
  "#22C55E",
  "#14B8A6",
  "#06B6D4",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#F43F5E",
];

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

function isValidHex(v: string): boolean {
  return HEX_COLOR_RE.test(v);
}

function getLuminance(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length !== 6) return 0;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function normalizeHexInput(value: string): string {
  let v = value.startsWith("#") ? value : `#${value}`;
  v = "#" + v.slice(1).replace(/[^0-9A-Fa-f]/g, "");
  return v.slice(0, 7).toUpperCase();
}

interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; color: string }) => void;
  project?: Project | null;
  isSubmitting?: boolean;
}

export function ProjectForm({
  open,
  onClose,
  onSubmit,
  project,
  isSubmitting,
}: ProjectFormProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [hexInput, setHexInput] = useState(COLOR_PALETTE[0]);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setColor(project.color);
      setHexInput(project.color);
      setShowCustomPicker(!COLOR_PALETTE.includes(project.color));
    } else {
      setName("");
      setColor(COLOR_PALETTE[0]);
      setHexInput(COLOR_PALETTE[0]);
      setShowCustomPicker(false);
    }
  }, [project, open]);

  const isCustomColor = !COLOR_PALETTE.includes(color);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), color });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {project ? "Edytuj projekt" : "Dodaj projekt"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projectName">Nazwa projektu</Label>
            <Input
              id="projectName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Kolor</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setColor(c);
                    setHexInput(c);
                  }}
                  className={`h-8 w-8 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    color === c
                      ? "ring-2 ring-ring ring-offset-2"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Kolor ${c}`}
                  aria-pressed={color === c}
                />
              ))}
              {/* Custom color toggle — circle with plus */}
              <button
                type="button"
                onClick={() => setShowCustomPicker((prev) => !prev)}
                className={`h-8 w-8 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex items-center justify-center ${
                  isCustomColor
                    ? "ring-2 ring-ring ring-offset-2"
                    : showCustomPicker
                      ? "border-2 border-dashed border-foreground text-foreground"
                      : "border-2 border-dashed border-muted-foreground/50 text-muted-foreground/50 hover:border-foreground hover:text-foreground hover:scale-110"
                }`}
                style={
                  isCustomColor
                    ? { backgroundColor: color }
                    : undefined
                }
                aria-label="Kolor niestandardowy"
              >
                {isCustomColor ? (
                  <Pencil className="h-3.5 w-3.5" style={{ color: getLuminance(color) > 0.55 ? "#1a1a1a" : "#ffffff" }} />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Custom color picker panel */}
            {showCustomPicker && (
              <div className="space-y-3 rounded-md border p-3">
                <HexColorPicker
                  color={color}
                  onChange={(newColor) => {
                    const upper = newColor.toUpperCase();
                    setColor(upper);
                    setHexInput(upper);
                  }}
                  style={{ width: "100%" }}
                />
                <div className="flex items-center gap-2">
                  <span
                    className="h-9 w-9 shrink-0 rounded-md border border-border"
                    style={{
                      backgroundColor: isValidHex(hexInput) ? hexInput : color,
                    }}
                  />
                  <Input
                    value={hexInput}
                    onChange={(e) => {
                      const normalized = normalizeHexInput(e.target.value);
                      setHexInput(normalized);
                      if (isValidHex(normalized)) {
                        setColor(normalized);
                      }
                    }}
                    onBlur={() => {
                      if (!isValidHex(hexInput)) {
                        setHexInput(color);
                      }
                    }}
                    placeholder="#000000"
                    maxLength={7}
                    className="font-mono"
                    aria-label="Kod koloru HEX"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
