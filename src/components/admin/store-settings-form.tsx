"use client";

import { useActionState, useState } from "react";

import type { AdminFormState } from "@/actions/admin-state";
import { initialAdminFormState } from "@/actions/admin-state";
import { CloudinaryUploadField } from "@/components/admin/cloudinary-upload-field";
import { FormSubmitButton } from "@/components/admin/form-submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { StoreSettings, BusinessHour } from "@/schemas/settings";

type StoreSettingsFormProps = {
  action: (state: AdminFormState, payload: FormData) => Promise<AdminFormState>;
  disabled?: boolean;
  disabledReason?: string;
  settings: StoreSettings;
  cloudinaryEnabled?: boolean;
};

const DEFAULT_ACCENT = "#7c3aed";
const DEFAULT_ACCENT_STRONG = "#5b21b6";

const DEFAULT_HOURS: BusinessHour[] = [
  { day: "Lunes", open: "09:00", close: "18:00" },
  { day: "Martes", open: "09:00", close: "18:00" },
  { day: "Miércoles", open: "09:00", close: "18:00" },
  { day: "Jueves", open: "09:00", close: "18:00" },
  { day: "Viernes", open: "09:00", close: "18:00" },
  { day: "Sábado", open: "09:00", close: "13:00" },
  { day: "Domingo", open: "", close: "", closed: true },
];

function getFieldError(state: AdminFormState, fieldName: string) {
  return state.fieldErrors?.[fieldName]?.[0];
}

export function StoreSettingsForm({
  action,
  disabled = false,
  disabledReason,
  settings,
  cloudinaryEnabled = false,
}: StoreSettingsFormProps) {
  const [state, formAction] = useActionState(action, initialAdminFormState);
  const [accent, setAccent] = useState(settings.themeAccent ?? DEFAULT_ACCENT);
  const [accentStrong, setAccentStrong] = useState(
    settings.themeAccentStrong ?? DEFAULT_ACCENT_STRONG,
  );
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>(
    settings.businessHours && settings.businessHours.length > 0
      ? settings.businessHours
      : DEFAULT_HOURS,
  );
  const [locationAddress, setLocationAddress] = useState(settings.locationAddress ?? "");
  const [locationLat, setLocationLat] = useState(settings.locationLat?.toString() ?? "");
  const [locationLng, setLocationLng] = useState(settings.locationLng?.toString() ?? "");

  const updateHour = (index: number, field: keyof BusinessHour, value: string | boolean) => {
    setBusinessHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)),
    );
  };

  return (
    <form action={formAction} className="space-y-5">
      {/* Hidden fields for complex data */}
      <input name="businessHours" type="hidden" value={JSON.stringify(businessHours)} />
      <input name="locationAddress" type="hidden" value={locationAddress} />
      <input name="locationLat" type="hidden" value={locationLat} />
      <input name="locationLng" type="hidden" value={locationLng} />

      <fieldset className="space-y-5 disabled:opacity-60" disabled={disabled}>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="store-name">
            Nombre de tienda
          </label>
          <Input defaultValue={settings.name} id="store-name" name="name" placeholder="Studio Catalog" />
          {getFieldError(state, "name") ? (
            <p className="text-sm text-[var(--accent-strong)]">{getFieldError(state, "name")}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="store-description">
            Descripcion
          </label>
          <Textarea
            defaultValue={settings.description}
            id="store-description"
            name="description"
            placeholder="Catalogo moderno con checkout directo a WhatsApp."
          />
          {getFieldError(state, "description") ? (
            <p className="text-sm text-[var(--accent-strong)]">{getFieldError(state, "description")}</p>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="store-whatsapp">
              WhatsApp
            </label>
            <Input defaultValue={settings.whatsappNumber} id="store-whatsapp" name="whatsappNumber" placeholder="573001234567" />
            <p className="text-xs text-[var(--muted-foreground)]">
              Número con código de país. Se usará en el botón flotante de WhatsApp y el checkout.
            </p>
            {getFieldError(state, "whatsappNumber") ? (
              <p className="text-sm text-[var(--accent-strong)]">{getFieldError(state, "whatsappNumber")}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="store-currency">
              Moneda
            </label>
            <Input defaultValue={settings.currency} id="store-currency" maxLength={3} name="currency" placeholder="COP" />
            {getFieldError(state, "currency") ? (
              <p className="text-sm text-[var(--accent-strong)]">{getFieldError(state, "currency")}</p>
            ) : null}
          </div>
        </div>

        {/* Logo */}
        <div className="space-y-2 border-t border-[var(--border)] pt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
            Identidad visual
          </p>
          <label className="text-sm font-medium" htmlFor="store-logo">
            Logo de la tienda
          </label>
          <p className="text-xs text-[var(--muted-foreground)]">
            Aparecerá en el header del catálogo. Ideal cuadrado o circular, fondo transparente.
          </p>
          <div className="mt-2">
            <CloudinaryUploadField
              cloudinaryEnabled={cloudinaryEnabled}
              defaultPublicId={settings.logoPublicId ?? null}
              defaultValue={settings.logoUrl ?? ""}
              folder="catalog/branding"
              publicIdFieldName="logoPublicId"
              urlFieldName="logoUrl"
            />
          </div>
          {getFieldError(state, "logoUrl") ? (
            <p className="text-sm text-[var(--accent-strong)]">{getFieldError(state, "logoUrl")}</p>
          ) : null}
        </div>

        {/* Colors */}
        <div className="space-y-3 border-t border-[var(--border)] pt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
            Colores de la tienda
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField
              hint="Botones, badges y enlaces destacados."
              id="store-theme-accent"
              label="Color principal"
              name="themeAccent"
              onChange={setAccent}
              value={accent}
            />
            <ColorField
              hint="Hover, énfasis y elementos secundarios."
              id="store-theme-accent-strong"
              label="Color intenso"
              name="themeAccentStrong"
              onChange={setAccentStrong}
              value={accentStrong}
            />
          </div>
          {getFieldError(state, "themeAccent") ? (
            <p className="text-sm text-[var(--accent-strong)]">{getFieldError(state, "themeAccent")}</p>
          ) : null}
          {getFieldError(state, "themeAccentStrong") ? (
            <p className="text-sm text-[var(--accent-strong)]">
              {getFieldError(state, "themeAccentStrong")}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/70 p-4">
            <span className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
              Vista previa
            </span>
            <button
              className="rounded-full px-5 py-2 text-sm font-semibold text-white transition"
              style={{ backgroundColor: accent }}
              type="button"
            >
              Botón principal
            </button>
            <button
              className="rounded-full px-5 py-2 text-sm font-semibold text-white transition"
              style={{ backgroundColor: accentStrong }}
              type="button"
            >
              Botón intenso
            </button>
          </div>
        </div>

        {/* Business Hours */}
        <div className="space-y-3 border-t border-[var(--border)] pt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
            Horarios de atención
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Se mostrarán en el footer de la tienda online.
          </p>
          <div className="space-y-2">
            {businessHours.map((hour, index) => (
              <div
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white/70 px-3 py-2"
                key={hour.day}
              >
                <span className="w-24 text-sm font-medium shrink-0">{hour.day}</span>
                <label className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] shrink-0">
                  <input
                    checked={hour.closed ?? false}
                    className="size-3.5 rounded accent-[var(--accent)]"
                    onChange={(e) => updateHour(index, "closed", e.target.checked)}
                    type="checkbox"
                  />
                  Cerrado
                </label>
                {!hour.closed ? (
                  <>
                    <input
                      className="h-8 w-20 rounded-lg border border-[var(--border)] bg-white px-2 text-sm outline-none focus:border-[var(--accent)]"
                      onChange={(e) => updateHour(index, "open", e.target.value)}
                      placeholder="09:00"
                      type="time"
                      value={hour.open}
                    />
                    <span className="text-xs text-[var(--muted-foreground)]">a</span>
                    <input
                      className="h-8 w-20 rounded-lg border border-[var(--border)] bg-white px-2 text-sm outline-none focus:border-[var(--accent)]"
                      onChange={(e) => updateHour(index, "close", e.target.value)}
                      placeholder="18:00"
                      type="time"
                      value={hour.close}
                    />
                  </>
                ) : (
                  <span className="text-xs italic text-[var(--muted-foreground)]">Sin atención</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="space-y-3 border-t border-[var(--border)] pt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
            Ubicación de la tienda
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Se mostrará un mapa interactivo en el footer de la tienda online.
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="location-address">
              Dirección
            </label>
            <Input
              id="location-address"
              onChange={(e) => setLocationAddress(e.target.value)}
              placeholder="Av. San Martín 1234, Resistencia, Chaco"
              value={locationAddress}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="location-lat">
                Latitud
              </label>
              <Input
                id="location-lat"
                onChange={(e) => setLocationLat(e.target.value)}
                placeholder="-27.4513"
                step="any"
                type="number"
                value={locationLat}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="location-lng">
                Longitud
              </label>
              <Input
                id="location-lng"
                onChange={(e) => setLocationLng(e.target.value)}
                placeholder="-58.9867"
                step="any"
                type="number"
                value={locationLng}
              />
            </div>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            Tip: busca tu tienda en Google Maps, haz clic derecho y copia las coordenadas.
          </p>
        </div>

        {disabledReason ? (
          <p className="text-sm text-[var(--muted-foreground)]">{disabledReason}</p>
        ) : null}

        {state.status !== "idle" && state.message ? (
          <p className={state.status === "error" ? "text-sm text-[var(--accent-strong)]" : "text-sm text-[var(--foreground)]"}>
            {state.message}
          </p>
        ) : null}

        <FormSubmitButton pendingLabel="Guardando ajustes..." type="submit" variant="accent">
          Guardar ajustes
        </FormSubmitButton>
      </fieldset>
    </form>
  );
}

type ColorFieldProps = {
  id: string;
  name: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
};

function ColorField({ id, name, label, hint, value, onChange }: ColorFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2">
        <input
          aria-label={`${label} (selector)`}
          className="size-8 cursor-pointer rounded-md border border-[var(--border)] bg-transparent"
          id={id}
          onChange={(event) => onChange(event.target.value)}
          type="color"
          value={value}
        />
        <input
          className="flex-1 bg-transparent font-mono text-sm uppercase outline-none"
          maxLength={7}
          name={name}
          onChange={(event) => onChange(event.target.value)}
          pattern="#[0-9a-fA-F]{6}"
          placeholder="#d35d47"
          type="text"
          value={value}
        />
      </div>
      {hint ? <p className="text-xs text-[var(--muted-foreground)]">{hint}</p> : null}
    </div>
  );
}