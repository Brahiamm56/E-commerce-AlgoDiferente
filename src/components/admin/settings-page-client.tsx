"use client";

import { useActionState, useState } from "react";
import { Save } from "lucide-react";

import type { AdminFormState } from "@/actions/admin-state";
import { initialAdminFormState } from "@/actions/admin-state";
import { Badge } from "@/components/ui/badge";
import { CloudinaryUploadField } from "@/components/admin/cloudinary-upload-field";
import { FormSubmitButton } from "@/components/admin/form-submit-button";
import { ThemeCustomizer } from "@/components/admin/theme-customizer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { StoreSettings, BusinessHour } from "@/schemas/settings";

type SettingsPageClientProps = {
  action: (state: AdminFormState, payload: FormData) => Promise<AdminFormState>;
  disabled?: boolean;
  disabledReason?: string;
  settings: StoreSettings;
  cloudinaryEnabled?: boolean;
};

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

export function SettingsPageClient({
  action,
  disabled = false,
  disabledReason,
  settings,
  cloudinaryEnabled = false,
}: SettingsPageClientProps) {
  const [state, formAction] = useActionState(action, initialAdminFormState);
  const [accent, setAccent] = useState(settings.themeAccent ?? "#7c3aed");
  const [accentStrong, setAccentStrong] = useState(settings.themeAccentStrong ?? "#5b21b6");
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>(
    settings.businessHours && settings.businessHours.length > 0
      ? settings.businessHours
      : DEFAULT_HOURS,
  );
  const [locationAddress, setLocationAddress] = useState(settings.locationAddress ?? "");
  const [locationLat, setLocationLat] = useState(settings.locationLat?.toString() ?? "");
  const [locationLng, setLocationLng] = useState(settings.locationLng?.toString() ?? "");

  const [socialFacebook, setSocialFacebook] = useState(settings.socialFacebook ?? "");
  const [socialInstagram, setSocialInstagram] = useState(settings.socialInstagram ?? "");
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(
    settings.freeShippingThresholdCents
      ? (settings.freeShippingThresholdCents / 100).toString()
      : "",
  );

  const updateHour = (index: number, field: keyof BusinessHour, value: string | boolean) => {
    setBusinessHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)),
    );
  };

  return (
    <form action={formAction}>
      {/* Hidden fields for complex data */}
      <input name="businessHours" type="hidden" value={JSON.stringify(businessHours)} />
      <input name="locationAddress" type="hidden" value={locationAddress} />
      <input name="locationLat" type="hidden" value={locationLat} />
      <input name="locationLng" type="hidden" value={locationLng} />
      <input name="socialFacebook" type="hidden" value={socialFacebook} />
      <input name="socialInstagram" type="hidden" value={socialInstagram} />
      <input name="freeShippingThreshold" type="hidden" value={freeShippingThreshold} />

      {/* Sticky top bar with save button */}
      <div className="sticky top-0 z-20 -mx-5 -mt-6 mb-6 flex items-center justify-between border-b border-[var(--border)] bg-white/80 px-5 py-3 backdrop-blur-xl sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10 xl:-mx-12 xl:px-12">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold sm:text-2xl">Ajustes</h1>
          {state.status !== "idle" && state.message ? (
            <p className={`mt-0.5 text-xs ${state.status === "error" ? "text-red-600" : "text-emerald-600"}`}>
              {state.message}
            </p>
          ) : null}
        </div>
        <FormSubmitButton pendingLabel="Guardando..." type="submit" variant="accent">
          <Save className="mr-1.5 size-4" />
          Guardar ajustes
        </FormSubmitButton>
      </div>

      <fieldset className="disabled:opacity-60" disabled={disabled}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ====== LEFT COLUMN: Configuration ====== */}
          <div className="space-y-6">
            <section className="surface-panel rounded-[2rem] p-6">
              <Badge>Tienda</Badge>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold">
                Configuración base
              </h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Datos de la home, WhatsApp y configuración general.
              </p>

              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="store-name">Nombre de tienda</label>
                  <Input defaultValue={settings.name} id="store-name" name="name" placeholder="Studio Catalog" />
                  {getFieldError(state, "name") ? <p className="text-sm text-red-600">{getFieldError(state, "name")}</p> : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="store-description">Descripción</label>
                  <Textarea defaultValue={settings.description} id="store-description" name="description" placeholder="Catalogo moderno con checkout directo a WhatsApp." />
                  {getFieldError(state, "description") ? <p className="text-sm text-red-600">{getFieldError(state, "description")}</p> : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="store-whatsapp">WhatsApp</label>
                    <Input defaultValue={settings.whatsappNumber} id="store-whatsapp" name="whatsappNumber" placeholder="573001234567" />
                    <p className="text-xs text-[var(--muted-foreground)]">Número con código de país.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="store-currency">Moneda</label>
                    <Input defaultValue={settings.currency} id="store-currency" maxLength={3} name="currency" placeholder="COP" />
                  </div>
                </div>

                {/* Logo */}
                <div className="space-y-2 border-t border-[var(--border)] pt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Identidad visual</p>
                  <label className="text-sm font-medium" htmlFor="store-logo">Logo de la tienda</label>
                  <p className="text-xs text-[var(--muted-foreground)]">Aparecerá en el header del catálogo.</p>
                  <CloudinaryUploadField
                    cloudinaryEnabled={cloudinaryEnabled}
                    defaultPublicId={settings.logoPublicId ?? null}
                    defaultValue={settings.logoUrl ?? ""}
                    folder="catalog/branding"
                    previewVariant="square"
                    publicIdFieldName="logoPublicId"
                    urlFieldName="logoUrl"
                  />
                </div>

                {/* Accent colors */}
                <div className="space-y-3 border-t border-[var(--border)] pt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Colores de acento</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ColorField id="theme-accent" label="Color principal" name="themeAccent" onChange={setAccent} value={accent} />
                    <ColorField id="theme-accent-strong" label="Color intenso" name="themeAccentStrong" onChange={setAccentStrong} value={accentStrong} />
                  </div>
                </div>
              </div>
            </section>

            {/* Business hours */}
            <section className="surface-panel rounded-[2rem] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Horarios de atención</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">Se mostrarán en el footer de la tienda.</p>
              <div className="mt-3 space-y-2">
                {businessHours.map((hour, index) => (
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white/70 px-3 py-2" key={hour.day}>
                    <span className="w-20 text-xs font-medium shrink-0 sm:w-24 sm:text-sm">{hour.day}</span>
                    <label className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)] shrink-0 sm:text-xs">
                      <input checked={hour.closed ?? false} className="size-3 accent-[var(--accent)]" onChange={(e) => updateHour(index, "closed", e.target.checked)} type="checkbox" />
                      Cerrado
                    </label>
                    {!hour.closed ? (
                      <>
                        <input className="h-7 w-[4.5rem] rounded-lg border border-[var(--border)] bg-white px-1.5 text-xs outline-none focus:border-[var(--accent)]" onChange={(e) => updateHour(index, "open", e.target.value)} type="time" value={hour.open} />
                        <span className="text-[10px] text-[var(--muted-foreground)]">a</span>
                        <input className="h-7 w-[4.5rem] rounded-lg border border-[var(--border)] bg-white px-1.5 text-xs outline-none focus:border-[var(--accent)]" onChange={(e) => updateHour(index, "close", e.target.value)} type="time" value={hour.close} />
                      </>
                    ) : (
                      <span className="text-[10px] italic text-[var(--muted-foreground)]">Sin atención</span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Location */}
            <section className="surface-panel rounded-[2rem] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Ubicación de la tienda</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">Mapa interactivo en el footer.</p>
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="loc-address">Dirección</label>
                  <Input id="loc-address" onChange={(e) => setLocationAddress(e.target.value)} placeholder="Av. San Martín 1234" value={locationAddress} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="loc-coords">Coordenadas</label>
                  <Input
                    id="loc-coords"
                    onChange={(e) => {
                      const val = e.target.value;
                      const parts = val.split(",").map((s) => s.trim());
                      if (parts.length === 2) {
                        setLocationLat(parts[0]);
                        setLocationLng(parts[1]);
                      } else {
                        // Allow typing; store raw in lat for now
                        setLocationLat(val);
                        setLocationLng("");
                      }
                    }}
                    placeholder="-27.4651, -58.9702"
                    value={locationLat && locationLng ? `${locationLat}, ${locationLng}` : locationLat}
                  />
                  <p className="text-[10px] text-[var(--muted-foreground)]">Pega las coordenadas de Google Maps (clic derecho → copiar coordenadas).</p>
                </div>
              </div>
            </section>

            {/* Social Media */}
            <section className="surface-panel rounded-[2rem] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Redes Sociales</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">Enlaces a perfiles oficiales.</p>
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="social-instagram">Instagram URL</label>
                  <Input
                    className={getFieldError(state, "socialInstagram") ? "border-red-500" : ""}
                    id="social-instagram"
                    onChange={(e) => setSocialInstagram(e.target.value)}
                    placeholder="https://instagram.com/tumarca"
                    type="url"
                    value={socialInstagram}
                  />
                  {getFieldError(state, "socialInstagram") && (
                    <p className="text-xs text-red-500">{getFieldError(state, "socialInstagram")}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="social-facebook">Facebook URL</label>
                  <Input
                    className={getFieldError(state, "socialFacebook") ? "border-red-500" : ""}
                    id="social-facebook"
                    onChange={(e) => setSocialFacebook(e.target.value)}
                    placeholder="https://facebook.com/tumarca"
                    type="url"
                    value={socialFacebook}
                  />
                  {getFieldError(state, "socialFacebook") && (
                    <p className="text-xs text-red-500">{getFieldError(state, "socialFacebook")}</p>
                  )}
                </div>
                <div className="space-y-1.5 border-t border-[var(--border)] pt-3">
                  <label className="text-sm font-medium" htmlFor="free-shipping-threshold">
                    Mínimo para envío gratis
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted-foreground)]">$</span>
                    <Input
                      className="pl-7"
                      id="free-shipping-threshold"
                      inputMode="decimal"
                      onChange={(e) => setFreeShippingThreshold(e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder="15000"
                      type="text"
                      value={freeShippingThreshold}
                    />
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">Vacío para desactivar. Se mostrará en el carrito como barra de progreso motivacional.</p>
                </div>
              </div>
            </section>
          </div>

          {/* ====== RIGHT COLUMN: Theme Customizer ====== */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <ThemeCustomizer
              accent={accent}
              accentStrong={accentStrong}
              onAccentChange={setAccent}
              onAccentStrongChange={setAccentStrong}
              settings={settings}
            />
          </div>
        </div>

        {disabledReason ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">{disabledReason}</p> : null}
      </fieldset>
    </form>
  );
}

function ColorField({ id, label, name, value, onChange }: {
  id: string; label: string; name: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" htmlFor={id}>{label}</label>
      <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-2.5 py-1.5">
        <input aria-label={label} className="size-7 cursor-pointer rounded-md border border-[var(--border)] bg-transparent" id={id} onChange={(e) => onChange(e.target.value)} type="color" value={value} />
        <input className="flex-1 bg-transparent font-mono text-xs uppercase outline-none" maxLength={7} name={name} onChange={(e) => onChange(e.target.value)} pattern="#[0-9a-fA-F]{6}" type="text" value={value} />
      </div>
    </div>
  );
}
