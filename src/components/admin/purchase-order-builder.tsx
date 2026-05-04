"use client";

import { useDeferredValue, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronDown, FileSpreadsheet, Search, Shirt, Trash2, Truck } from "lucide-react";
import { z } from "zod";

import {
  createPurchaseOrderAction,
  type PurchaseOrderCreateActionResult,
} from "@/actions/purchase-orders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  AdminSupplier,
  PurchaseOrderBuilderProduct,
} from "@/lib/suppliers";
import { cn, formatCurrencyFromCents } from "@/lib/utils";
import {
  purchaseOrderCreateSchema,
  type PurchaseOrderCreateInput,
} from "@/schemas/purchase-order";

const purchaseOrderFormSchema = z.object({
  supplierId: z.string().min(1, "Selecciona un proveedor."),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        productName: z.string().min(1),
        productKind: z.enum(["APPAREL", "FOOTWEAR"]),
        unitCostCents: z.number().int().min(0),
        variants: z
          .array(
            z.object({
              variantId: z.string().min(1),
              size: z.string().min(1),
              colorName: z.string().min(1),
              colorHex: z.string().nullable(),
              internalSku: z.string().min(1),
              quantity: z.number().int().min(0),
            }),
          )
          .min(1),
      }),
    )
    .min(1, "Agrega al menos un producto."),
});

type PurchaseOrderFormValues = z.infer<typeof purchaseOrderFormSchema>;

type PurchaseOrderBuilderProps = {
  products: PurchaseOrderBuilderProduct[];
  suppliers: AdminSupplier[];
};

type ComboboxOption = {
  id: string;
  label: string;
  description?: string;
  meta?: string;
  keywords?: string[];
};

type SearchableComboboxProps = {
  disabled?: boolean;
  emptyLabel: string;
  onSelect: (value: string) => void;
  options: ComboboxOption[];
  placeholder: string;
  selectedId: string;
};

type LineSummary = {
  productId: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  quantity: number;
  subtotalCents: number;
  unitCostCents: number;
};

const apparelSizeOrder = [
  "XXXS",
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
  "4XL",
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function centsFromInput(value: string) {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

function formatDecimalFromCents(value: number) {
  if (value === 0) return "0";
  return (value / 100).toFixed(2).replace(/\.00$/u, "");
}

function getSuggestedCostCents(product: PurchaseOrderBuilderProduct, supplierId: string) {
  for (const variant of product.variants) {
    const supplierCost = variant.supplierCosts[supplierId];
    if (typeof supplierCost === "number" && supplierCost > 0) {
      return supplierCost;
    }
  }

  for (const variant of product.variants) {
    if (variant.costCents > 0) {
      return variant.costCents;
    }
  }

  return 0;
}

function getOrderedSizes(
  productKind: "APPAREL" | "FOOTWEAR",
  variants: Array<{ size: string }>,
) {
  const uniqueSizes = Array.from(new Set(variants.map((variant) => variant.size)));

  return uniqueSizes.sort((left, right) => {
    if (productKind === "FOOTWEAR") {
      const leftValue = Number(left.replace(",", "."));
      const rightValue = Number(right.replace(",", "."));

      if (Number.isFinite(leftValue) && Number.isFinite(rightValue)) {
        return leftValue - rightValue;
      }
    }

    const leftIndex = apparelSizeOrder.indexOf(left.toUpperCase());
    const rightIndex = apparelSizeOrder.indexOf(right.toUpperCase());

    if (leftIndex >= 0 || rightIndex >= 0) {
      return (leftIndex >= 0 ? leftIndex : Number.MAX_SAFE_INTEGER) -
        (rightIndex >= 0 ? rightIndex : Number.MAX_SAFE_INTEGER);
    }

    return left.localeCompare(right, "es");
  });
}

function buildMatrixRows(
  productKind: "APPAREL" | "FOOTWEAR",
  variants: PurchaseOrderFormValues["items"][number]["variants"],
) {
  const sizeOrder = getOrderedSizes(productKind, variants);
  const rows = new Map<string, { colorHex: string | null; colorName: string; variants: Map<string, typeof variants[number]> }>();

  for (const variant of variants) {
    const existing = rows.get(variant.colorName) ?? {
      colorHex: variant.colorHex,
      colorName: variant.colorName,
      variants: new Map<string, typeof variant>(),
    };

    existing.variants.set(variant.size, variant);
    rows.set(variant.colorName, existing);
  }

  return {
    rows: Array.from(rows.values()),
    sizes: sizeOrder,
  };
}

function getVariantSummary(
  item: PurchaseOrderFormValues["items"][number],
  lineSummaries: LineSummary[],
) {
  const lines = lineSummaries.filter((line) => line.productId === item.productId);

  if (lines.length === 0) return "Sin cantidades cargadas";

  return lines.map((line) => `${line.variantLabel} x${line.quantity}`).join(" · ");
}

function SearchableCombobox({
  disabled = false,
  emptyLabel,
  onSelect,
  options,
  placeholder,
  selectedId,
}: SearchableComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.id === selectedId);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  const filteredOptions = options.filter((option) => {
    if (!deferredQuery.trim()) return true;

    const terms = [option.label, option.description ?? "", option.meta ?? "", ...(option.keywords ?? [])]
      .map(normalizeText)
      .join(" ");

    return terms.includes(normalizeText(deferredQuery));
  });

  return (
    <div className="relative" ref={rootRef}>
      <button
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-2xl border border-[var(--border)] bg-white/80 px-4 text-left text-sm transition",
          disabled
            ? "cursor-not-allowed opacity-60"
            : "hover:border-[var(--accent)] focus-visible:border-[var(--accent)]",
        )}
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className={selectedOption ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className={cn("size-4 text-[var(--muted-foreground)] transition", isOpen && "rotate-180")} />
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 rounded-[1.5rem] border border-[var(--border)] bg-white p-3 shadow-[0_24px_80px_rgba(17,24,39,0.12)]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              autoFocus
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[#faf8fd] pl-9 pr-3 text-sm outline-none transition focus:border-[var(--accent)]"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar..."
              value={query}
            />
          </div>

          <div className="mt-3 max-h-72 space-y-1 overflow-y-auto pr-1">
            {filteredOptions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-5 text-center text-sm text-[var(--muted-foreground)]">
                {emptyLabel}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.id === selectedId;

                return (
                  <button
                    className={cn(
                      "flex w-full items-start justify-between rounded-xl px-3 py-3 text-left transition",
                      isSelected
                        ? "bg-[rgba(124,58,237,0.10)] text-[var(--foreground)]"
                        : "hover:bg-[#f7f4fb] text-[var(--foreground)]",
                    )}
                    key={option.id}
                    onClick={() => {
                      onSelect(option.id);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    type="button"
                  >
                    <div>
                      <p className="text-sm font-semibold">{option.label}</p>
                      {option.description ? (
                        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{option.description}</p>
                      ) : null}
                    </div>
                    {isSelected ? <Check className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PurchaseOrderBuilder({ products, suppliers }: PurchaseOrderBuilderProps) {
  const router = useRouter();
  const [submissionState, setSubmissionState] = useState<PurchaseOrderCreateActionResult | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setError,
    clearErrors,
    setValue,
  } = useForm<PurchaseOrderFormValues>({
    defaultValues: {
      supplierId: "",
      notes: "",
      items: [],
    },
    resolver: zodResolver(purchaseOrderFormSchema),
  });

  const { append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const supplierId = useWatch({ control, name: "supplierId" }) ?? "";
  const items = useWatch({ control, name: "items" }) ?? [];
  const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId) ?? null;

  const supplierOptions: ComboboxOption[] = suppliers.map((supplier) => ({
    id: supplier.id,
    label: supplier.name,
    description: [supplier.contactName, supplier.phone].filter(Boolean).join(" · ") || "Proveedor disponible para nuevas ordenes.",
    meta: supplier.email ?? undefined,
    keywords: [supplier.email ?? "", supplier.address ?? "", supplier.notes ?? ""],
  }));

  const productOptions: ComboboxOption[] = products.map((product) => ({
    id: product.id,
    label: product.name,
    description: `${product.kind === "FOOTWEAR" ? "Calzado" : "Indumentaria"} · ${product.variants.length} variantes`,
    meta: product.brand ?? undefined,
    keywords: [
      product.brand ?? "",
      ...product.variants.flatMap((variant) => [variant.size, variant.colorName, variant.internalSku]),
    ],
  }));

  const lineSummaries: LineSummary[] = items.flatMap((item) =>
    item.variants
      .filter((variant) => variant.quantity > 0)
      .map((variant) => ({
        productId: item.productId,
        productName: item.productName,
        variantId: variant.variantId,
        variantLabel: `${variant.colorName} / ${variant.size}`,
        quantity: variant.quantity,
        unitCostCents: item.unitCostCents,
        subtotalCents: variant.quantity * item.unitCostCents,
      })),
  );

  const totalUnits = lineSummaries.reduce((sum, line) => sum + line.quantity, 0);
  const totalAmountCents = lineSummaries.reduce((sum, line) => sum + line.subtotalCents, 0);

  function addProductToOrder(productId: string) {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) return;

    if (items.some((item) => item.productId === productId)) {
      setSubmissionState({
        status: "error",
        message: "Ese producto ya forma parte del pedido actual.",
      });
      return;
    }

    append({
      productId: product.id,
      productName: product.name,
      productKind: product.kind,
      unitCostCents: getSuggestedCostCents(product, supplierId),
      variants: product.variants.map((variant) => ({
        variantId: variant.id,
        size: variant.size,
        colorName: variant.colorName,
        colorHex: variant.colorHex,
        internalSku: variant.internalSku,
        quantity: 0,
      })),
    });

    clearErrors("items");
    setSubmissionState(null);
  }

  function triggerDownload(orderId: string) {
    const link = document.createElement("a");
    link.href = `/api/admin/purchase-orders/${orderId}/export`;
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  const onSubmit = handleSubmit((values) => {
    const payloadCandidate = {
      supplierId: values.supplierId,
      notes: values.notes ?? "",
      items: values.items.flatMap((item) =>
        item.variants
          .filter((variant) => variant.quantity > 0)
          .map((variant) => ({
            productId: item.productId,
            variantId: variant.variantId,
            quantity: variant.quantity,
            unitCostCents: item.unitCostCents,
          })),
      ),
    };

    if (payloadCandidate.items.length === 0) {
      setError("items", {
        type: "manual",
        message: "Carga al menos una cantidad antes de finalizar el pedido.",
      });
      setSubmissionState({
        status: "error",
        message: "Carga al menos una cantidad antes de finalizar el pedido.",
      });
      return;
    }

    const parsedPayload = purchaseOrderCreateSchema.safeParse(payloadCandidate);

    if (!parsedPayload.success) {
      const fieldErrors = parsedPayload.error.flatten().fieldErrors;

      if (fieldErrors.supplierId?.[0]) {
        setError("supplierId", { type: "manual", message: fieldErrors.supplierId[0] });
      }

      if (fieldErrors.items?.[0]) {
        setError("items", { type: "manual", message: fieldErrors.items[0] });
      }

      setSubmissionState({
        status: "error",
        message: "Revisa los datos del pedido antes de finalizar.",
        fieldErrors,
      });
      return;
    }

    clearErrors();
    setSubmissionState(null);

    startTransition(async () => {
      const result = await createPurchaseOrderAction(parsedPayload.data as PurchaseOrderCreateInput);
      setSubmissionState(result);

      if (result.status === "success" && result.orderId) {
        reset({
          supplierId: "",
          notes: "",
          items: [],
        });
        router.refresh();
        triggerDownload(result.orderId);
      }
    });
  });

  return (
    <form className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,420px)]" onSubmit={onSubmit}>
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <Badge>Flujo guiado</Badge>
            <CardTitle className="mt-3">Arma la orden y exportala en un paso</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)]">
              Selecciona un proveedor, agrega productos con su matriz de talles y finaliza el pedido con un archivo listo para compartir.
            </p>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Proveedor</label>
              <SearchableCombobox
                disabled={items.length > 0}
                emptyLabel="No encontramos proveedores con ese criterio."
                onSelect={(value) => {
                  setValue("supplierId", value, { shouldDirty: true, shouldValidate: true });
                  clearErrors("supplierId");
                  setSubmissionState(null);
                }}
                options={supplierOptions}
                placeholder="Buscar proveedor..."
                selectedId={supplierId}
              />
              {errors.supplierId?.message ? (
                <p className="text-sm text-[var(--accent-strong)]">{errors.supplierId.message}</p>
              ) : null}
              <p className="text-xs text-[var(--muted-foreground)]">
                {items.length > 0
                  ? "Para cambiar el proveedor, primero elimina los productos del pedido."
                  : "El costo sugerido se toma del ultimo costo registrado para ese proveedor, cuando exista."}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--border)] bg-[#faf8fd] p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(124,58,237,0.12)] text-[var(--accent)]">
                  <Truck className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {selectedSupplier?.name ?? "Aun sin proveedor"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                    {selectedSupplier
                      ? [selectedSupplier.contactName, selectedSupplier.phone, selectedSupplier.email]
                          .filter(Boolean)
                          .join(" · ") || "Sin datos de contacto complementarios."
                      : "Selecciona un proveedor para habilitar el buscador de productos."}
                  </p>
                  {selectedSupplier?.address ? (
                    <p className="mt-2 text-xs text-[var(--muted-foreground)]">{selectedSupplier.address}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="purchase-order-notes">
                Notas del pedido
              </label>
              <Textarea
                id="purchase-order-notes"
                placeholder="Ej. Entrega pactada para la proxima semana, incluir reposicion de temporada."
                {...register("notes")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <Badge>Catalogo proveedor</Badge>
            <CardTitle className="mt-3">Buscador de productos</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)]">
              Al agregar un producto, el sistema detecta si trabaja con talles numericos o alfanumericos y arma la grilla automaticamente.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <SearchableCombobox
              disabled={!supplierId}
              emptyLabel="No encontramos productos para esa busqueda."
              onSelect={addProductToOrder}
              options={productOptions}
              placeholder={supplierId ? "Buscar producto..." : "Selecciona primero un proveedor"}
              selectedId=""
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              Puedes cargar varios productos en la misma orden. Cada uno mantiene su costo editable y sus cantidades por talle.
            </p>
          </CardContent>
        </Card>

        {items.length === 0 ? (
          <Card>
            <CardContent className="py-10">
              <div className="rounded-[1.75rem] border border-dashed border-[var(--border)] bg-white/70 px-6 py-10 text-center">
                <p className="text-base font-semibold text-[var(--foreground)]">Todavia no hay productos en el pedido</p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  Selecciona un proveedor y luego usa el buscador para empezar a cargar talles y cantidades.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          items.map((item, itemIndex) => {
            const { rows, sizes } = buildMatrixRows(item.productKind, item.variants);
            const unitsForItem = item.variants.reduce((sum, variant) => sum + variant.quantity, 0);

            return (
              <Card key={item.productId}>
                <CardHeader className="pb-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle>{item.productName}</CardTitle>
                        <Badge className="bg-white">
                          {item.productKind === "FOOTWEAR" ? "Calzado" : "Indumentaria"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                        {item.productKind === "FOOTWEAR"
                          ? "Matriz de talles numericos lista para completar."
                          : "Matriz de talles alfanumericos lista para completar."}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                          Costo unitario
                        </span>
                        <Input
                          inputMode="decimal"
                          min="0"
                          onChange={(event) =>
                            setValue(
                              `items.${itemIndex}.unitCostCents`,
                              centsFromInput(event.target.value),
                              { shouldDirty: true },
                            )
                          }
                          step="0.01"
                          type="number"
                          value={formatDecimalFromCents(item.unitCostCents)}
                        />
                      </label>

                      <Button
                        onClick={() => remove(itemIndex)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <Trash2 className="mr-1.5 size-4" />
                        Quitar
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="overflow-x-auto rounded-[1.5rem] border border-[var(--border)] bg-white/70">
                    <table className="min-w-full border-collapse text-sm">
                      <thead className="bg-[#faf8fd] text-left text-[11px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                        <tr>
                          <th className="px-4 py-3">Color</th>
                          {sizes.map((size) => (
                            <th className="px-3 py-3 text-center" key={size}>
                              {size}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr className="border-t border-[var(--border)]" key={row.colorName}>
                            <td className="min-w-44 px-4 py-3">
                              <div className="flex items-center gap-3">
                                <span
                                  className="size-3 rounded-full border border-black/10"
                                  style={{
                                    backgroundColor: row.colorHex ?? "#e5e7eb",
                                  }}
                                />
                                <div>
                                  <p className="font-semibold text-[var(--foreground)]">{row.colorName}</p>
                                  <p className="text-xs text-[var(--muted-foreground)]">
                                    {Array.from(row.variants.values()).reduce((sum, variant) => sum + variant.quantity, 0)} unidades
                                  </p>
                                </div>
                              </div>
                            </td>

                            {sizes.map((size) => {
                              const variant = row.variants.get(size);

                              return (
                                <td className="px-3 py-3 text-center" key={`${row.colorName}-${size}`}>
                                  {variant ? (
                                    <div className="space-y-1">
                                      <input
                                        className="h-11 w-16 rounded-xl border border-[var(--border)] bg-white text-center text-sm outline-none transition focus:border-[var(--accent)]"
                                        inputMode="numeric"
                                        min="0"
                                        onChange={(event) =>
                                          setValue(
                                            `items.${itemIndex}.variants.${item.variants.findIndex((candidate) => candidate.variantId === variant.variantId)}.quantity`,
                                            Math.max(0, Number(event.target.value || 0)),
                                            { shouldDirty: true },
                                          )
                                        }
                                        type="number"
                                        value={variant.quantity === 0 ? "" : String(variant.quantity)}
                                      />
                                      <p className="text-[10px] text-[var(--muted-foreground)]">
                                        SKU {variant.internalSku}
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-[var(--muted-foreground)]">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-[var(--border)] bg-[#faf8fd] px-4 py-3">
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {getVariantSummary(item, lineSummaries)}
                    </p>
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {unitsForItem} u. · {formatCurrencyFromCents(unitsForItem * item.unitCostCents)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <Card>
          <CardHeader className="pb-4">
            <Badge>Resumen</Badge>
            <CardTitle className="mt-3">Listado del pedido</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)]">
              Revisa cantidades, costo unitario y subtotales antes de exportar el documento.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {lineSummaries.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
                Aun no hay variantes con cantidad mayor a cero.
              </div>
            ) : (
              <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border)]">
                <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.9fr] gap-3 bg-[#faf8fd] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                  <span>Producto</span>
                  <span>Variante</span>
                  <span className="text-right">Cantidad</span>
                  <span className="text-right">Subtotal</span>
                </div>
                <div className="divide-y divide-[var(--border)] bg-white/80">
                  {lineSummaries.map((line) => (
                    <div
                      className="grid grid-cols-[1.2fr_1fr_0.8fr_0.9fr] gap-3 px-4 py-3 text-sm"
                      key={line.variantId}
                    >
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">{line.productName}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {formatCurrencyFromCents(line.unitCostCents)} c/u
                        </p>
                      </div>
                      <p className="text-[var(--muted-foreground)]">{line.variantLabel}</p>
                      <p className="text-right font-semibold text-[var(--foreground)]">{line.quantity}</p>
                      <p className="text-right font-semibold text-[var(--foreground)]">
                        {formatCurrencyFromCents(line.subtotalCents)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 rounded-[1.5rem] border border-[var(--border)] bg-[#faf8fd] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Proveedor</span>
                <span className="font-semibold text-[var(--foreground)]">
                  {selectedSupplier?.name ?? "Pendiente"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Lineas activas</span>
                <span className="font-semibold text-[var(--foreground)]">{lineSummaries.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Unidades totales</span>
                <span className="font-semibold text-[var(--foreground)]">{totalUnits}</span>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 text-sm">
                <span className="text-[var(--muted-foreground)]">Total estimado</span>
                <span className="text-lg font-semibold text-[var(--foreground)]">
                  {formatCurrencyFromCents(totalAmountCents)}
                </span>
              </div>
            </div>

            {errors.items?.message ? (
              <p className="text-sm text-[var(--accent-strong)]">{errors.items.message}</p>
            ) : null}

            {submissionState?.message ? (
              <div
                className={cn(
                  "rounded-[1.5rem] px-4 py-3 text-sm",
                  submissionState.status === "success"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border border-rose-200 bg-rose-50 text-rose-700",
                )}
              >
                {submissionState.message}
              </div>
            ) : null}

            <Button
              className="w-full"
              disabled={!supplierId || lineSummaries.length === 0 || isSubmitting}
              size="lg"
              type="submit"
              variant="accent"
            >
              <FileSpreadsheet className="mr-2 size-4" />
              {isSubmitting ? "Generando archivo..." : "Finalizar pedido"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(227,198,138,0.2)] text-[#8a5b18]">
                {selectedSupplier ? <Truck className="size-4" /> : <Shirt className="size-4" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Documento exportable</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  El archivo incluye datos del proveedor, fecha de emision, identidad de la tienda y detalle por talle para compartir o procesar la compra.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
