"use client";

import { Upload, X } from "lucide-react";
import { type ChangeEvent, Fragment, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ProductImageFieldItem = {
  publicId: string;
  url: string;
};

type ProductImagesFieldProps = {
  cloudinaryEnabled: boolean;
  defaultItems?: Array<{
    publicId?: string | null;
    url: string;
  }>;
  maxItems?: number;
};

type UploadSignatureResponse = {
  apiKey: string;
  cloudName: string;
  folder: string;
  signature: string;
  timestamp: number;
};

function normalizeItems(items: ProductImagesFieldProps["defaultItems"] = []): ProductImageFieldItem[] {
  return items
    .filter((item): item is { publicId?: string | null; url: string } => Boolean(item?.url))
    .map((item) => ({
      publicId: item.publicId ?? "",
      url: item.url,
    }));
}

export function ProductImagesField({
  cloudinaryEnabled,
  defaultItems = [],
  maxItems = 8,
}: ProductImagesFieldProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<ProductImageFieldItem[]>(() => normalizeItems(defaultItems));
  const [manualUrl, setManualUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const remainingSlots = Math.max(0, maxItems - items.length);

  async function requestUploadSignature() {
    const signatureResponse = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ folder: "catalog/products" }),
    });

    if (!signatureResponse.ok) {
      const payload = (await signatureResponse.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "No fue posible obtener la firma de upload.");
    }

    return (await signatureResponse.json()) as UploadSignatureResponse;
  }

  async function uploadFiles(files: File[]) {
    if (!cloudinaryEnabled || files.length === 0) {
      return;
    }

    if (remainingSlots === 0) {
      setUploadError(`Solo puedes cargar hasta ${maxItems} imagenes por producto.`);
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);

    setIsUploading(true);
    setUploadError(null);

    try {
      const signature = await requestUploadSignature();
      const uploadedItems: ProductImageFieldItem[] = [];

      for (const file of filesToUpload) {
        const uploadData = new FormData();

        uploadData.append("file", file);
        uploadData.append("api_key", signature.apiKey);
        uploadData.append("folder", signature.folder);
        uploadData.append("signature", signature.signature);
        uploadData.append("timestamp", String(signature.timestamp));

        const uploadResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
          {
            method: "POST",
            body: uploadData,
          },
        );

        if (!uploadResponse.ok) {
          throw new Error("Cloudinary rechazo una de las imagenes seleccionadas.");
        }

        const payload = (await uploadResponse.json()) as {
          public_id: string;
          secure_url: string;
        };

        uploadedItems.push({
          publicId: payload.public_id,
          url: payload.secure_url,
        });
      }

      setItems((currentItems) => [...currentItems, ...uploadedItems]);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "No fue posible subir las imagenes.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    await uploadFiles(files);
    event.target.value = "";
  }

  function addManualUrl() {
    const trimmedUrl = manualUrl.trim();

    if (!trimmedUrl) {
      return;
    }

    if (remainingSlots === 0) {
      setUploadError(`Solo puedes cargar hasta ${maxItems} imagenes por producto.`);
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setUploadError("Pega una URL valida para la imagen.");
      return;
    }

    setItems((currentItems) => {
      if (currentItems.some((item) => item.url === trimmedUrl)) {
        return currentItems;
      }

      return [...currentItems, { publicId: "", url: trimmedUrl }];
    });
    setManualUrl("");
    setUploadError(null);
  }

  function removeItem(url: string) {
    setItems((currentItems) => currentItems.filter((item) => item.url !== url));
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Fragment key={`${item.publicId}-${item.url}`}>
          <input name="imagePublicId" type="hidden" value={item.publicId} />
          <input name="imageUrl" type="hidden" value={item.url} />
        </Fragment>
      ))}

      <input
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        multiple
        onChange={handleFileChange}
        type="file"
      />

      <div className="rounded-[1.5rem] border border-[var(--border)] bg-white/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">Galeria del producto</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Sube varias imagenes. La primera se usara como portada en la tienda.
            </p>
          </div>

          <Button
            disabled={!cloudinaryEnabled || isUploading || remainingSlots === 0}
            onClick={() => fileInputRef.current?.click()}
            type="button"
            variant="outline"
          >
            <Upload className="mr-2 size-4" />
            {isUploading ? "Subiendo..." : "Subir imagenes"}
          </Button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Input
            onChange={(event) => setManualUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addManualUrl();
              }
            }}
            placeholder="https://..."
            value={manualUrl}
          />
          <Button onClick={addManualUrl} type="button" variant="ghost">
            Agregar URL
          </Button>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
          <span>{items.length} imagenes cargadas</span>
          <span>{remainingSlots} espacios disponibles</span>
        </div>

        {items.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((item, index) => (
              <div key={item.url} className="overflow-hidden rounded-[1.25rem] border border-[var(--border)] bg-white shadow-sm">
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Admin upload preview may point to arbitrary external URLs entered manually. */}
                  <img alt={`Imagen ${index + 1}`} className="h-full w-full object-cover" src={item.url} />
                  <button
                    aria-label={`Eliminar imagen ${index + 1}`}
                    className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white transition hover:bg-black"
                    onClick={() => removeItem(item.url)}
                    type="button"
                  >
                    <X className="size-3.5" />
                  </button>
                  {index === 0 ? (
                    <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-900">
                      Portada
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[1.25rem] border border-dashed border-[var(--border)] bg-gray-50 px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
            Aun no cargaste imagenes para este producto.
          </div>
        )}
      </div>

      {uploadError ? <p className="text-sm text-[var(--accent-strong)]">{uploadError}</p> : null}
    </div>
  );
}
