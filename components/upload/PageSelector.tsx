"use client";

import { useState, useMemo, useId } from "react";

interface PageSelectorProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  helpText?: string;
  presets?: Array<{ label: string; value: string }>;
  validate?: (value: string) => string | null;
}

export default function PageSelector({
  label,
  placeholder = "e.g. 1-3, 5, 8-10",
  value,
  onChange,
  helpText,
  presets,
  validate,
}: PageSelectorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const instanceId = useId();

  const validationError = useMemo(() => {
    if (!validate || !value.trim()) return null;
    return validate(value);
  }, [value, validate]);

  const inputId = `page-selector-${instanceId}`;
  const errorId = `page-selector-error-${instanceId}`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-foreground">{label}</label>
      <input
        id={inputId}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        aria-invalid={!!validationError}
        aria-describedby={validationError ? errorId : undefined}
        className={`w-full px-3 py-2 text-sm rounded-xl border transition-colors bg-white ${
          validationError
            ? "border-danger focus:ring-2 focus:ring-danger/20"
            : isFocused
              ? "border-primary ring-2 ring-primary/20"
              : "border-border hover:border-muted-foreground/30"
        } text-foreground placeholder:text-muted-foreground/50 focus:outline-none`}
      />
      {validationError && (
        <p
          id={errorId}
          className="text-xs text-danger"
          role="alert"
        >
          {validationError}
        </p>
      )}
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset.value || preset.label}
              type="button"
              onClick={() => onChange(preset.value)}
              aria-pressed={value === preset.value}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer ${
                value === preset.value
                  ? "border-primary bg-primary-light text-primary font-medium"
                  : "border-border bg-white text-muted-foreground hover:border-muted-foreground/30 hover:bg-muted/50"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
      {helpText && !validationError && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}

interface PageRangeDisplayProps {
  totalPages: number;
  selectedPages?: string;
}

export function PageRangeDisplay({ totalPages, selectedPages }: PageRangeDisplayProps) {
  if (!selectedPages || selectedPages.trim() === "") {
    return (
      <p className="text-xs text-muted-foreground">
        All {totalPages} page{totalPages !== 1 ? "s" : ""} selected
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      {totalPages} page{totalPages !== 1 ? "s" : ""} total &middot; Currently selecting: {selectedPages}
    </p>
  );
}

interface RotationSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const ROTATION_OPTIONS = [
  { value: "90", label: "90\u00B0", description: "Clockwise" },
  { value: "180", label: "180\u00B0", description: "Upside down" },
  { value: "270", label: "270\u00B0", description: "Counter-clockwise" },
];

export function RotationSelector({ value, onChange }: RotationSelectorProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">Rotation</label>
      <div className="flex gap-2">
        {ROTATION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={`flex-1 px-3 py-2 text-sm rounded-xl border transition-colors cursor-pointer ${
              value === opt.value
                ? "border-primary bg-primary-light text-primary font-medium"
                : "border-border bg-white text-muted-foreground hover:border-muted-foreground/30"
            }`}
          >
            <span className="block font-medium">{opt.label}</span>
            <span className="block text-xs opacity-70">{opt.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface SplitModeSelectorProps {
  mode: string;
  onModeChange: (mode: string) => void;
}

export function SplitModeSelector({ mode, onModeChange }: SplitModeSelectorProps) {
  const modes = [
    { value: "all", label: "All Pages", description: "Each page becomes a separate PDF" },
    { value: "every", label: "Every N Pages", description: "Group pages in sets of N" },
    { value: "ranges", label: "Custom Ranges", description: "Specify page ranges" },
  ];

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">Split Mode</label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {modes.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onModeChange(opt.value)}
            aria-pressed={mode === opt.value}
            className={`px-3 py-2 text-sm rounded-xl border transition-colors cursor-pointer ${
              mode === opt.value
                ? "border-primary bg-primary-light text-primary font-medium"
                : "border-border bg-white text-muted-foreground hover:border-muted-foreground/30"
            }`}
          >
            <span className="block font-medium">{opt.label}</span>
            <span className="block text-xs opacity-70">{opt.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface DuplicateCountSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function DuplicateCountSelector({ value, onChange }: DuplicateCountSelectorProps) {
  const counts = ["2", "3", "4", "5"];

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">Duplicate Count</label>
      <div className="flex gap-2">
        {counts.map((count) => (
          <button
            key={count}
            onClick={() => onChange(count)}
            aria-pressed={value === count}
            className={`flex-1 px-3 py-2 text-sm rounded-xl border transition-colors cursor-pointer ${
              value === count
                ? "border-primary bg-primary-light text-primary font-medium"
                : "border-border bg-white text-muted-foreground hover:border-muted-foreground/30"
            }`}
          >
            {count}x
          </button>
        ))}
      </div>
    </div>
  );
}
