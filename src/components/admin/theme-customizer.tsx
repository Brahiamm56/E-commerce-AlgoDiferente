"use client";

import { Palette, RectangleHorizontal, Square } from "lucide-react";
import { useState } from "react";

import type { StoreSettings } from "@/schemas/settings";

type ThemeCustomizerProps = {
  accent: string;
  accentStrong: string;
  onAccentChange: (value: string) => void;
  onAccentStrongChange: (value: string) => void;
  settings: StoreSettings;
};

const RADIUS_OPTIONS = [
  { value: "none", label: "Sin borde", preview: "rounded-none" },
  { value: "sm", label: "Sutil", preview: "rounded-sm" },
  { value: "md", label: "Medio", preview: "rounded-md" },
  { value: "lg", label: "Grande", preview: "rounded-lg" },
  { value: "xl", label: "Extra", preview: "rounded-xl" },
  { value: "2xl", label: "Máximo", preview: "rounded-2xl" },
  { value: "full", label: "Completo", preview: "rounded-full" },
] as const;

const BTN_RADIUS_OPTIONS = [
  { value: "none", label: "Recto" },
  { value: "sm", label: "Sutil" },
  { value: "md", label: "Medio" },
  { value: "lg", label: "Grande" },
  { value: "full", label: "Píldora" },
] as const;

const PRESET_THEMES = [
  {
    name: "Logo ST",
    bg: "#f7f4fb",
    card: "#ffffff",
    border: "#e7e0f2",
    accent: "#7c3aed",
    accentStrong: "#5b21b6",
  },
  {
    name: "Minimal",
    bg: "#f6f6f3",
    card: "#ffffff",
    border: "#e3e1da",
    accent: "#3f3a4a",
    accentStrong: "#191622",
  },
  {
    name: "Oliva",
    bg: "#f4f6ef",
    card: "#ffffff",
    border: "#dde5d2",
    accent: "#60724c",
    accentStrong: "#334126",
  },
  {
    name: "Grafito",
    bg: "#f5f5f6",
    card: "#ffffff",
    border: "#dedee3",
    accent: "#2f3340",
    accentStrong: "#111827",
  },
  {
    name: "Uva suave",
    bg: "#f8f5fb",
    card: "#ffffff",
    border: "#eadff0",
    accent: "#8b5cf6",
    accentStrong: "#6d28d9",
  },
];

export function ThemeCustomizer({
  accent,
  accentStrong,
  onAccentChange,
  onAccentStrongChange,
  settings,
}: ThemeCustomizerProps) {
  const [bg, setBg] = useState(settings.themeBackground ?? "#f7f4fb");
  const [cardBg, setCardBg] = useState(settings.themeCardBg ?? "#ffffff");
  const [cardBorder, setCardBorder] = useState(settings.themeCardBorder ?? "#e7e0f2");
  const [cardRadius, setCardRadius] = useState(settings.themeCardRadius ?? "xl");
  const [buttonRadius, setButtonRadius] = useState(settings.themeButtonRadius ?? "full");

  const applyPreset = (preset: (typeof PRESET_THEMES)[number]) => {
    setBg(preset.bg);
    setCardBg(preset.card);
    setCardBorder(preset.border);
    onAccentChange(preset.accent);
    onAccentStrongChange(preset.accentStrong);
  };

  // Card radius class for preview
  const radiusClass = RADIUS_OPTIONS.find((r) => r.value === cardRadius)?.preview ?? "rounded-xl";
  const btnRadiusClass =
    buttonRadius === "full"
      ? "rounded-full"
      : buttonRadius === "lg"
        ? "rounded-lg"
        : buttonRadius === "md"
          ? "rounded-md"
          : buttonRadius === "sm"
            ? "rounded-sm"
            : "rounded-none";

  return (
    <div className="surface-panel space-y-5 rounded-[2rem] p-6">
      {/* Hidden inputs that submit with the main form */}
      <input name="themeBackground" type="hidden" value={bg} />
      <input name="themeCardBg" type="hidden" value={cardBg} />
      <input name="themeCardBorder" type="hidden" value={cardBorder} />
      <input name="themeCardRadius" type="hidden" value={cardRadius} />
      <input name="themeButtonRadius" type="hidden" value={buttonRadius} />

      <div className="flex items-center gap-2">
        <Palette className="size-5 text-[var(--accent)]" />
        <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Diseño de la tienda
        </h3>
      </div>
      <p className="text-xs text-[var(--muted-foreground)]">
        Personaliza los colores, bordes y formas de la tienda que ven tus clientes.
      </p>

      {/* Preset themes */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
          Temas predefinidos
        </p>
        <div className="grid grid-cols-3 gap-2">
          {PRESET_THEMES.map((preset) => (
            <button
              className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--border)] p-2.5 transition hover:-translate-y-0.5 hover:shadow-md"
              key={preset.name}
              onClick={() => applyPreset(preset)}
              type="button"
            >
              <div className="flex gap-1">
                <span
                  className="size-5 rounded-full border border-white/20 shadow-sm"
                  style={{ backgroundColor: preset.bg }}
                />
                <span
                  className="size-5 rounded-full border border-white/20 shadow-sm"
                  style={{ backgroundColor: preset.accent }}
                />
                <span
                  className="size-5 rounded-full border border-white/20 shadow-sm"
                  style={{ backgroundColor: preset.card }}
                />
              </div>
              <span className="text-[10px] font-medium">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom colors */}
      <div className="space-y-3 border-t border-[var(--border)] pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
          Colores personalizados
        </p>
        <div className="grid grid-cols-1 gap-3">
          <ColorPicker color={bg} label="Fondo de la tienda" onChange={setBg} />
          <ColorPicker color={cardBg} label="Fondo de tarjetas" onChange={setCardBg} />
          <ColorPicker color={cardBorder} label="Borde de tarjetas" onChange={setCardBorder} />
          <ColorPicker color={accent} label="Color de acento" onChange={onAccentChange} />
          <ColorPicker color={accentStrong} label="Color intenso" onChange={onAccentStrongChange} />
        </div>
      </div>

      {/* Card radius */}
      <div className="space-y-3 border-t border-[var(--border)] pt-4">
        <div className="flex items-center gap-2">
          <Square className="size-4 text-[var(--muted-foreground)]" />
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
            Bordes de tarjetas
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {RADIUS_OPTIONS.map((opt) => (
            <button
              className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition ${
                cardRadius === opt.value
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--accent)]"
              }`}
              key={opt.value}
              onClick={() => setCardRadius(opt.value)}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Button radius */}
      <div className="space-y-3 border-t border-[var(--border)] pt-4">
        <div className="flex items-center gap-2">
          <RectangleHorizontal className="size-4 text-[var(--muted-foreground)]" />
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
            Bordes de botones
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BTN_RADIUS_OPTIONS.map((opt) => (
            <button
              className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition ${
                buttonRadius === opt.value
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--accent)]"
              }`}
              key={opt.value}
              onClick={() => setButtonRadius(opt.value)}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live preview */}
      <div className="space-y-3 border-t border-[var(--border)] pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
          Vista previa
        </p>
        <div
          className="space-y-3 rounded-2xl p-4 transition-colors duration-300"
          style={{ backgroundColor: bg }}
        >
          {/* Preview card */}
          <div
            className={`${radiusClass} border p-4 shadow-sm transition-all duration-300`}
            style={{
              backgroundColor: cardBg,
              borderColor: cardBorder,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-12 w-12 rounded-lg"
                style={{ backgroundColor: cardBorder }}
              />
              <div className="space-y-1.5 flex-1">
                <div
                  className="h-3 w-3/4 rounded-full"
                  style={{ backgroundColor: cardBorder }}
                />
                <div
                  className="h-2 w-1/2 rounded-full opacity-50"
                  style={{ backgroundColor: cardBorder }}
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: bg === "#1a1a1a" ? "#fff" : "#14110f" }}>
                $ 3.699
              </span>
              <button
                className={`${btnRadiusClass} px-3 py-1 text-[11px] font-semibold text-white transition`}
                style={{ backgroundColor: accent }}
                type="button"
              >
                Comprar
              </button>
            </div>
          </div>

          {/* Preview mini cards row */}
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div
                className={`${radiusClass} flex-1 border p-2 shadow-sm transition-all duration-300`}
                key={i}
                style={{
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                }}
              >
                <div
                  className="aspect-square w-full rounded-lg"
                  style={{ backgroundColor: cardBorder, opacity: 0.5 }}
                />
                <div
                  className="mt-1.5 h-2 w-3/4 rounded-full"
                  style={{ backgroundColor: cardBorder }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorPicker({
  color,
  label,
  onChange,
}: {
  color: string;
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <input
        aria-label={label}
        className="size-8 cursor-pointer rounded-lg border border-[var(--border)] bg-transparent"
        onChange={(e) => onChange(e.target.value)}
        type="color"
        value={color}
      />
      <div className="flex-1">
        <p className="text-xs font-medium">{label}</p>
        <input
          className="mt-0.5 w-full bg-transparent font-mono text-[11px] uppercase text-[var(--muted-foreground)] outline-none"
          maxLength={7}
          onChange={(e) => onChange(e.target.value)}
          pattern="#[0-9a-fA-F]{6}"
          type="text"
          value={color}
        />
      </div>
    </div>
  );
}
