"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";

import type { AdminFormState } from "@/actions/admin-state";
import { initialAdminFormState } from "@/actions/admin-state";
import { createCategoryQuickAction } from "@/actions/admin";
import { CloudinaryUploadField } from "@/components/admin/cloudinary-upload-field";
import { FormSubmitButton } from "@/components/admin/form-submit-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AdminCategory, AdminProduct, AdminProductKind } from "@/lib/admin-catalog";

type ProductFormProps = {
  action: (state: AdminFormState, payload: FormData) => Promise<AdminFormState>;
  categories: AdminCategory[];
  cloudinaryEnabled: boolean;
  disabled?: boolean;
  disabledReason?: string;
  pendingLabel: string;
  product?: AdminProduct;
  submitLabel: string;
};

function getFieldError(state: AdminFormState, fieldName: string) {
  return state.fieldErrors?.[fieldName]?.[0];
}

const APPAREL_SIZE_PRESET = ["XS", "S", "M", "L", "XL", "XXL"];
const FOOTWEAR_SIZE_PRESET = Array.from({ length: 28 }, (_, index) => String(index + 20));
const DEFAULT_SELECTED_SIZES: Record<AdminProductKind, string[]> = {
  APPAREL: ["S", "M", "L", "XL"],
  FOOTWEAR: ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44"],
};

type VariantColorRow = {
  hex: string;
  id: string;
  name: string;
  stockBySize: Record<string, number>;
};

function createColorRow(id = "color-0"): VariantColorRow {
  return {
    hex: "#111827",
    id,
    name: "Sin color",
    stockBySize: {},
  };
}

function getSizePreset(kind: AdminProductKind) {
  return kind === "FOOTWEAR" ? FOOTWEAR_SIZE_PRESET : APPAREL_SIZE_PRESET;
}

function normalizeCustomSize(kind: AdminProductKind, value: string) {
  const trimmed = value.trim();
  return kind === "FOOTWEAR" ? trimmed.replace(/[^0-9.]/g, "") : trimmed.toUpperCase();
}

function QuickAddCategoryForm({
  onCancel,
  onSuccess,
}: {
  onCancel: () => void;
  onSuccess: (category: AdminCategory) => void;
}) {
  const [name, setName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitCategory() {
    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setErrorMessage("El nombre debe tener al menos 2 caracteres.");
      return;
    }

    const formData = new FormData();
    formData.append("name", trimmedName);
    setErrorMessage(null);

    startTransition(async () => {
      const state = await createCategoryQuickAction(initialAdminFormState, formData);

      if (
        state.status === "success" &&
        typeof state.data?.id === "string" &&
        typeof state.data?.name === "string" &&
        typeof state.data?.slug === "string"
      ) {
        onSuccess({
          description:
            typeof state.data.description === "string"
              ? state.data.description
              : "Categoria administrable desde el panel.",
          id: state.data.id,
          name: state.data.name,
          order: typeof state.data.order === "number" ? state.data.order : 0,
          productCount: typeof state.data.productCount === "number" ? state.data.productCount : 0,
          slug: state.data.slug,
        });
        setName("");
        return;
      }

      setErrorMessage(state.message ?? "No fue posible crear la categoría.");
    });
  }

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          className="h-9 flex-1 text-sm"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submitCategory();
            }
          }}
          placeholder="Nombre de categoría"
          value={name}
        />
        <button
          className="shrink-0 rounded-xl bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          disabled={isPending}
          onClick={submitCategory}
          type="button"
        >
          {isPending ? "..." : "Crear"}
        </button>
        <button
          className="shrink-0 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted-foreground)]"
          onClick={onCancel}
          type="button"
        >
          Cancelar
        </button>
      </div>
      {errorMessage ? (
        <p className="text-xs text-red-500">{errorMessage}</p>
      ) : null}
    </div>
  );
}

export function ProductForm({
  action,
  categories,
  cloudinaryEnabled,
  disabled = false,
  disabledReason,
  pendingLabel,
  product,
  submitLabel,
}: ProductFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, formAction] = useActionState(action, initialAdminFormState);
  const defaultCategoryId = product?.categoryId ?? categories[0]?.id ?? "";
  const [createdCategories, setCreatedCategories] = useState<AdminCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(defaultCategoryId);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [productKind, setProductKind] = useState<AdminProductKind>(product?.kind ?? "APPAREL");
  const [selectedSizes, setSelectedSizes] = useState<string[]>(() => DEFAULT_SELECTED_SIZES[productKind]);
  const [customSize, setCustomSize] = useState("");
  const [colorRows, setColorRows] = useState<VariantColorRow[]>(() => [createColorRow()]);
  const imageFieldKey = product
    ? `${product.id}-${product.imagePublicId ?? product.image}`
    : `create-${state.submissionKey ?? 0}`;

  const availableCategories = [...categories];

  for (const category of createdCategories) {
    if (!availableCategories.some((currentCategory) => currentCategory.id === category.id)) {
      availableCategories.push(category);
    }
  }

  const resolvedSelectedCategoryId =
    selectedCategoryId && availableCategories.some((category) => category.id === selectedCategoryId)
      ? selectedCategoryId
      : product?.categoryId ?? availableCategories[0]?.id ?? "";
  const variantDrafts = product
    ? []
    : colorRows.flatMap((colorRow) =>
        selectedSizes.map((size) => ({
          colorHex: colorRow.hex,
          colorName: colorRow.name.trim(),
          size,
          stock: colorRow.stockBySize[size] ?? 0,
        })),
      );
  const variantStockTotal = variantDrafts.reduce((sum, variant) => sum + variant.stock, 0);
  const sizePreset = getSizePreset(productKind);
  const visibleSizes = Array.from(new Set([...sizePreset, ...selectedSizes]));

  useEffect(() => {
    if (!product && state.status === "success") {
      formRef.current?.reset();
    }
  }, [product, state.status]);

  function handleKindChange(value: AdminProductKind) {
    setProductKind(value);

    if (!product) {
      setSelectedSizes(DEFAULT_SELECTED_SIZES[value]);
      setColorRows((currentRows) => currentRows.map((row) => ({ ...row, stockBySize: {} })));
    }
  }

  function toggleSize(size: string) {
    setSelectedSizes((currentSizes) =>
      currentSizes.includes(size)
        ? currentSizes.filter((currentSize) => currentSize !== size)
        : [...currentSizes, size],
    );
  }

  function addCustomSize() {
    const nextSize = normalizeCustomSize(productKind, customSize);

    if (!nextSize || selectedSizes.includes(nextSize)) {
      setCustomSize("");
      return;
    }

    setSelectedSizes((currentSizes) => [...currentSizes, nextSize]);
    setCustomSize("");
  }

  function updateColorRow(rowId: string, patch: Partial<Omit<VariantColorRow, "id" | "stockBySize">>) {
    setColorRows((currentRows) =>
      currentRows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    );
  }

  function updateVariantStock(rowId: string, size: string, value: string) {
    const parsedValue = Math.max(0, Math.floor(Number(value) || 0));

    setColorRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? { ...row, stockBySize: { ...row.stockBySize, [size]: parsedValue } }
          : row,
      ),
    );
  }

  return (
    <form action={formAction} className="space-y-5" ref={formRef}>
      {product ? <input name="productId" type="hidden" value={product.id} /> : null}
      {!product ? <input name="variants" type="hidden" value={JSON.stringify(variantDrafts)} /> : null}

      <fieldset className="space-y-5 disabled:opacity-60" disabled={disabled}>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={product ? `${product.id}-name` : "create-product-name"}>
            Nombre
          </label>
          <Input
            defaultValue={product?.name}
            id={product ? `${product.id}-name` : "create-product-name"}
            name="name"
            placeholder="Camisa Atelier"
          />
          {getFieldError(state, "name") ? (
            <p className="text-sm text-[var(--accent-strong)]">{getFieldError(state, "name")}</p>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_0.8fr_0.8fr]">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={product ? `${product.id}-sku` : "create-product-sku"}>
              SKU <span className="font-normal text-[var(--muted-foreground)]">(Opcional)</span>
            </label>
            <Input
              defaultValue={product?.sku ?? ""}
              id={product ? `${product.id}-sku` : "create-product-sku"}
              name="sku"
              placeholder="SKU-001"
            />
            {getFieldError(state, "sku") ? (
              <p className="text-sm text-[var(--accent-strong)]">{getFieldError(state, "sku")}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={product ? `${product.id}-price` : "create-product-price"}>
              Precio
            </label>
            <Input
              defaultValue={product ? String(product.priceCents / 100) : ""}
              id={product ? `${product.id}-price` : "create-product-price"}
              min="0"
              name="price"
              placeholder="1299"
              step="0.01"
              type="number"
            />
            <p className="text-xs text-[var(--muted-foreground)]">Se guarda en centavos internamente.</p>
            {getFieldError(state, "priceCents") ? (
              <p className="text-sm text-[var(--accent-strong)]">{getFieldError(state, "priceCents")}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={product ? `${product.id}-stock` : "create-product-stock"}>
              Stock
            </label>
            {product ? (
              <Input
                defaultValue={product.stock}
                id={`${product.id}-stock`}
                min="0"
                name="stock"
                step="1"
                type="number"
              />
            ) : (
              <Input
                id="create-product-stock"
                min="0"
                name="stock"
                readOnly
                step="1"
                type="number"
                value={variantStockTotal}
              />
            )}
            {getFieldError(state, "stock") ? (
              <p className="text-sm text-[var(--accent-strong)]">{getFieldError(state, "stock")}</p>
            ) : null}
          </div>
        </div>

        {!product ? (
          <div className="space-y-4 rounded-[1.5rem] border border-[var(--border)] bg-white/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Talles, colores y stock</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Total cargado: {variantStockTotal} unidades
                </p>
              </div>
              <span className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                {productKind === "FOOTWEAR" ? "Numeración" : "Letras"}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Talles</label>
              <div className="flex flex-wrap gap-2">
                {visibleSizes.map((size) => {
                  const selected = selectedSizes.includes(size);

                  return (
                    <button
                      className={
                        selected
                          ? "h-9 rounded-xl bg-[var(--foreground)] px-3 text-sm font-semibold text-white"
                          : "h-9 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--muted-foreground)] transition hover:border-[var(--foreground)]/40"
                      }
                      key={size}
                      onClick={() => toggleSize(size)}
                      type="button"
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Input
                  className="h-10 rounded-xl"
                  onChange={(event) => setCustomSize(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCustomSize();
                    }
                  }}
                  placeholder={productKind === "FOOTWEAR" ? "Agregar talle numérico" : "Agregar talle"}
                  value={customSize}
                />
                <button
                  className="h-10 shrink-0 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-black/5"
                  onClick={addCustomSize}
                  type="button"
                >
                  Agregar
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium">Colores</label>
                <button
                  className="text-xs font-semibold text-[var(--accent)] hover:underline"
                  onClick={() =>
                    setColorRows((currentRows) => [
                      ...currentRows,
                      { ...createColorRow(`color-${Date.now()}`), name: "" },
                    ])
                  }
                  type="button"
                >
                  + Agregar color
                </button>
              </div>

              {colorRows.map((colorRow, index) => (
                <div className="rounded-2xl border border-[var(--border)] bg-white p-3" key={colorRow.id}>
                  <div className="grid gap-2 sm:grid-cols-[1fr_88px_auto]">
                    <Input
                      className="h-10 rounded-xl"
                      onChange={(event) => updateColorRow(colorRow.id, { name: event.target.value })}
                      placeholder="Color"
                      value={colorRow.name}
                    />
                    <Input
                      aria-label="Color visual"
                      className="h-10 rounded-xl p-1"
                      onChange={(event) => updateColorRow(colorRow.id, { hex: event.target.value })}
                      type="color"
                      value={colorRow.hex}
                    />
                    <button
                      className="h-10 rounded-xl border border-[var(--border)] px-3 text-xs font-semibold text-[var(--muted-foreground)] disabled:opacity-40"
                      disabled={colorRows.length === 1}
                      onClick={() => setColorRows((currentRows) => currentRows.filter((row) => row.id !== colorRow.id))}
                      type="button"
                    >
                      Quitar
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {selectedSizes.map((size) => (
                      <label className="rounded-xl border border-[var(--border)] bg-gray-50/70 p-2" key={`${colorRow.id}-${size}`}>
                        <span className="block text-xs font-semibold text-[var(--muted-foreground)]">
                          {colorRow.name || `Color ${index + 1}`} / {size}
                        </span>
                        <Input
                          className="mt-1 h-9 rounded-lg bg-white"
                          min="0"
                          onChange={(event) => updateVariantStock(colorRow.id, size, event.target.value)}
                          step="1"
                          type="number"
                          value={colorRow.stockBySize[size] ?? 0}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {getFieldError(state, "variants") ? (
              <p className="text-sm text-[var(--accent-strong)]">{getFieldError(state, "variants")}</p>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={product ? `${product.id}-kind` : "create-product-kind"}>
              Tipo
            </label>
            <Select
              id={product ? `${product.id}-kind` : "create-product-kind"}
              name="kind"
              onChange={(event) => handleKindChange(event.target.value as AdminProductKind)}
              value={productKind}
            >
              <option value="APPAREL">Indumentaria</option>
              <option value="FOOTWEAR">Zapatillas</option>
            </Select>
            {getFieldError(state, "kind") ? (
              <p className="text-sm text-[var(--accent-strong)]">{getFieldError(state, "kind")}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" htmlFor={product ? `${product.id}-category` : "create-product-category"}>
                Categoria
              </label>
              {!showQuickAdd && (
                <button
                  className="text-xs text-[var(--accent)] hover:underline"
                  onClick={() => setShowQuickAdd(true)}
                  type="button"
                >
                  + Añadir categoría
                </button>
              )}
            </div>
            <Select
              id={product ? `${product.id}-category` : "create-product-category"}
              name="categoryId"
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              value={resolvedSelectedCategoryId}
            >
              {availableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            {showQuickAdd && (
              <QuickAddCategoryForm
                onCancel={() => setShowQuickAdd(false)}
                onSuccess={(category) => {
                  setCreatedCategories((currentCategories) => {
                    if (currentCategories.some((currentCategory) => currentCategory.id === category.id)) {
                      return currentCategories;
                    }

                    return [...currentCategories, category];
                  });
                  setShowQuickAdd(false);
                  setSelectedCategoryId(category.id);
                }}
              />
            )}
            {getFieldError(state, "categoryId") ? (
              <p className="text-sm text-[var(--accent-strong)]">{getFieldError(state, "categoryId")}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={product ? `${product.id}-status` : "create-product-status"}>
              Estado
            </label>
            <Select
              defaultValue={product?.status ?? "PUBLISHED"}
              id={product ? `${product.id}-status` : "create-product-status"}
              name="status"
            >
              <option value="DRAFT">Borrador</option>
              <option value="PUBLISHED">Publicado</option>
              <option value="ARCHIVED">Archivado</option>
            </Select>
            {getFieldError(state, "status") ? (
              <p className="text-sm text-[var(--accent-strong)]">{getFieldError(state, "status")}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={product ? `${product.id}-description` : "create-product-description"}>
            Descripcion
          </label>
          <Textarea
            defaultValue={product?.description}
            id={product ? `${product.id}-description` : "create-product-description"}
            name="description"
            placeholder="Describe el producto, el material y el argumento comercial."
          />
          {getFieldError(state, "description") ? (
            <p className="text-sm text-[var(--accent-strong)]">{getFieldError(state, "description")}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Imagen principal</label>
          <CloudinaryUploadField
            key={imageFieldKey}
            cloudinaryEnabled={cloudinaryEnabled}
            defaultPublicId={product?.imagePublicId}
            defaultValue={product?.image}
          />
          {getFieldError(state, "imageUrl") ? (
            <p className="text-sm text-[var(--accent-strong)]">{getFieldError(state, "imageUrl")}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={product ? `${product.id}-image-alt` : "create-product-image-alt"}>
            Texto alternativo de imagen
          </label>
          <Input
            defaultValue={product?.imageAlt ?? product?.name ?? ""}
            id={product ? `${product.id}-image-alt` : "create-product-image-alt"}
            name="imageAlt"
            placeholder="Camisa Atelier sobre fondo claro"
          />
          {getFieldError(state, "imageAlt") ? (
            <p className="text-sm text-[var(--accent-strong)]">{getFieldError(state, "imageAlt")}</p>
          ) : null}
        </div>

        <label className="flex items-center gap-3 rounded-[1.5rem] border border-[var(--border)] bg-white/70 px-4 py-3 text-sm font-medium">
          <input defaultChecked={product?.featured ?? false} name="featured" type="checkbox" />
          Marcar como destacado en home y grilla inicial.
        </label>

        {disabledReason ? (
          <p className="text-sm text-[var(--muted-foreground)]">{disabledReason}</p>
        ) : null}

        {state.status !== "idle" && state.message ? (
          <p className={state.status === "error" ? "text-sm text-[var(--accent-strong)]" : "text-sm text-[var(--foreground)]"}>
            {state.message}
          </p>
        ) : null}

        <FormSubmitButton pendingLabel={pendingLabel} type="submit" variant="accent">
          {submitLabel}
        </FormSubmitButton>
      </fieldset>
    </form>
  );
}