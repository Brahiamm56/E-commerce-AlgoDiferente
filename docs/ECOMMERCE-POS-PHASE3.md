# Ecommerce + POS - Fase 3 Catalogo con variantes

## Resumen ejecutivo

La tienda ya consume variantes vendibles por talle/color desde `ProductVariant`. El catalogo, busqueda, detalle, favoritos, carruseles, carrito y mensaje de WhatsApp conservan el producto padre visible, pero agregan al carrito la variante concreta con SKU interno, precio y stock propio.

## Decisiones de diseno

- **Compatibilidad incremental:** `Product.priceCents` y `Product.stock` siguen como fallback, mientras las pantallas usan `defaultVariant` cuando existe.
- **Precio por variante:** `mapCatalogProduct` calcula `minPriceCents`, `maxPriceCents` y `priceCents` desde variantes activas.
- **Stock disponible:** el stock publico suma `stock - stockReserved` por variante.
- **Carrito por variante:** `CartItem.id` pasa a ser el id de variante cuando corresponde; asi dos talles/colores del mismo producto pueden coexistir.
- **WhatsApp trazable:** el mensaje incluye `variantLabel` e `internalSku` para preparar pedidos sin ambiguedad.
- **Detalle listo para ropa:** `ProductPurchasePanel` permite elegir color y talle si hay mas de una variante.

## Archivos principales

- `src/lib/catalog.ts`: tipos `CatalogVariant`, mapper variant-aware y consultas con `Product.variants`.
- `src/components/shop/product-purchase-panel.tsx`: selector de color/talle, precio, stock, WhatsApp y carrito.
- `src/components/shop/add-to-cart-button.tsx`: agrega variante seleccionada o default.
- `src/store/cart.ts`: item persistido con `variantId`, `internalSku`, `variantLabel`, talle y color.
- `src/components/shop/cart-drawer.tsx`: muestra variante/SKU y los envia a WhatsApp.
- `src/lib/whatsapp.ts`: arma lineas de pedido con datos de variante.
- `prisma/backfill-variants.ts`: genera variantes default desde productos legacy.

## Validacion ejecutada

```bash
npm run db:generate
npm run lint
npx tsc --noEmit
npm run build
```

Prueba manual en `http://localhost:3000`:

- `/productos` carga 24 productos desde Supabase.
- `/productos/reebok-classic-leather` muestra variante default y SKU.
- `Añadir al carrito` abre el drawer con `UNICO / Sin color · SKU REEBOK-CLASSIC-LEATHER-UNICO`.

## Checklist de fase

- Catalogo publico usa precio/rango de variantes.
- Detalle permite variante seleccionada.
- Carrito persiste producto + variante.
- WhatsApp incluye variante y SKU.
- Backfill de variantes legacy ejecutado.
- Build de Next.js completo sin errores.

## Pendientes para la siguiente fase

- Convertir el checkout WhatsApp en checkout web persistente con `Order` y `OrderItem`.
- Integrar Mercado Pago Checkout Pro y webhooks idempotentes.
- Implementar descuento de stock transaccional al confirmar pago o venta POS.
- Cambiar formato monetario por defecto de `COP` a `ARS` de forma centralizada.
