# Ecommerce + POS para tienda de ropa - Fase 1

## Resumen ejecutivo

Esta fase define la arquitectura base para migrar el catalogo WhatsApp a un ecommerce con POS, stock compartido, cuenta corriente, proveedores, compras y reportes. El schema Prisma ya queda preparado para productos con variantes por talle/color, pedidos web, ventas POS, pagos, envios, caja diaria, ordenes de compra y auditoria.

La implementacion mantiene compatibilidad con el catalogo actual: `Product.priceCents`, `Product.stock` y `Product.sku` siguen existiendo mientras las pantallas se migran a `ProductVariant`. Esto evita romper el shop/admin existente en medio de la migracion.

## Decisiones de diseno

- **Producto padre + variante vendible:** `Product` representa la prenda visible; `ProductVariant` representa talle/color con `internalSku`, precio, costo y stock propio.
- **Precios y costos con `Decimal`:** los importes nuevos usan `Decimal @db.Decimal(12, 2)` para evitar errores de redondeo de `Float` en ARS, rentabilidad, recargos y deuda.
- **Stock por movimiento auditable:** `StockMovement` registra cada entrada/salida/ajuste con `stockBefore` y `stockAfter`. Permite stock negativo sin perder trazabilidad.
- **Pedidos web separados de ventas POS:** `Order` modela checkout online y Mercado Pago; `Sale` modela venta presencial. Ambos pueden generar pagos y movimientos de stock.
- **Pagos normalizados:** `Payment` permite efectivo, transferencia, tarjeta, cuenta corriente y Mercado Pago sin seguir agregando columnas ad hoc.
- **Cuenta corriente ledger-first:** `Customer.debtAccumulated` es el saldo rapido, pero el historial contable vive en `CustomerLedgerEntry`.
- **Caja diaria separada:** `CashRegisterSession` y `CashMovement` permiten apertura, movimientos, cierre y diferencias.
- **Proveedor + orden de compra:** `Supplier`, `PurchaseOrder` y `PurchaseOrderItem` preparan recepcion de mercaderia y actualizacion de costo.
- **Eventos Mercado Pago idempotentes:** `MercadoPagoWebhookEvent.eventKey` es unico para no duplicar efectos.
- **Compatibilidad incremental:** los campos legacy del catalogo actual quedan vivos hasta completar las fases de UI y acciones.

## Diagrama del schema

```text
Category 1--N Product 1--N ProductVariant
Product 1--N ProductImage
Product/ProductVariant 1--N OrderItem N--1 Order
ProductVariant 1--N SaleItem N--1 Sale

Customer 1--N CustomerAddress
Customer 1--N Order
Customer 1--N Sale
Customer 1--N CustomerLedgerEntry

Order 1--N Payment
Sale 1--N Payment
Order 1--N Shipment
Order 1--N MercadoPagoWebhookEvent

ProductVariant 1--N StockMovement
Order/Sale/PurchaseOrder 1--N StockMovement

CashRegisterSession 1--N Sale
CashRegisterSession 1--N CashMovement

Supplier 1--N PurchaseOrder 1--N PurchaseOrderItem N--1 ProductVariant
Supplier N--N ProductVariant via SupplierProduct

User 1--N AuditLog
User 1--N StockMovement
User 1--N CashRegisterSession/CashMovement
```

## Modelos principales

### Catalogo

- `Product`: prenda padre, categoria, estado, imagenes, atributos generales y dimensiones default.
- `ProductVariant`: talle/color vendible, `internalSku`, precio, costo, stock y dimensiones especificas opcionales.
- `ProductImage`: imagenes por producto en Cloudinary.
- `Category`: clasificacion publica/admin.

### Ecommerce

- `Order`: checkout web, estado, totales, cliente, direccion y referencia externa para Mercado Pago.
- `OrderItem`: snapshot de producto/variante/precio/costo al momento de compra.
- `Payment`: pagos online o internos, estado y payload externo.
- `MercadoPagoWebhookEvent`: idempotencia y auditoria de webhooks.
- `Shipment`: Andreani, remis local, retiro o despacho manual.
- `ShippingZone`: costo fijo de remis local por ciudad/rango de CP.

### POS y caja

- `Sale`: venta presencial con canal, cliente opcional, caja y totales nuevos sin romper campos legacy.
- `SaleItem`: item POS con variante opcional e `internalSku`.
- `CashRegisterSession`: apertura/cierre de caja.
- `CashMovement`: movimientos manuales o derivados de ventas/cobranzas.

### Clientes y cuenta corriente

- `Customer`: nombre, telefono unico, deuda acumulada y limite de credito.
- `CustomerAddress`: direcciones para checkout/envios.
- `CustomerLedgerEntry`: debitos, creditos y ajustes con saldo posterior.
- `InternalReceipt`: comprobantes internos para ventas, pagos de deuda, compras o ajustes.

### Proveedores y compras

- `Supplier`: proveedor.
- `SupplierProduct`: relacion proveedor-variante con SKU externo y ultimo costo.
- `PurchaseOrder`: orden de compra.
- `PurchaseOrderItem`: cantidades y costo de variantes a comprar/recibir.

### Auditoria

- `StockMovement`: auditoria de stock.
- `AuditLog`: cambios sensibles por usuario, entidad y payload antes/despues.

## Estructura de carpetas recomendada

```text
src/
  app/
    (shop)/
      checkout/
      pedidos/[id]/
      productos/[slug]/
    (admin)/
      admin/
        productos/
        variantes/
        pedidos/
        clientes/
        proveedores/
        reportes/
      pos/
        page.tsx
        caja/
    api/
      webhooks/
        mercadopago/
      checkout/
      shipping/
  actions/
    checkout.ts
    pos.ts
    stock.ts
    customers.ts
    suppliers.ts
  lib/
    services/
      catalog-service.ts
      checkout-service.ts
      payment-service.ts
      shipping-service.ts
      stock-service.ts
      pos-service.ts
      customer-ledger-service.ts
      purchase-order-service.ts
    integrations/
      mercadopago.ts
      andreani.ts
      cloudinary.ts
    auth/
      permissions.ts
  schemas/
    variant.ts
    checkout.ts
    payment.ts
    shipping.ts
    pos.ts
    customer.ts
    supplier.ts
    stock.ts
```

## Estrategia RLS Supabase + Prisma

⚠️ TRADE-OFF: Prisma usa el connection string directo y normalmente opera con privilegios de backend, por lo que no debe depender de RLS para proteger mutaciones internas.

Estrategia propuesta:

- **Backend Next/Prisma:** valida sesion y rol en `lib/auth/permissions.ts` antes de llamar servicios. Prisma queda como capa confiable server-side.
- **Supabase Auth:** usarlo como proveedor de identidad en fases siguientes. Los roles del negocio (`admin`, `vendedor_pos`, `cliente`) se guardan en metadata/perfil y se reflejan en tablas propias si hace falta.
- **RLS activado para tablas sensibles:** clientes, pedidos, ventas, pagos, caja, compras, auditoria. Las policies protegen cualquier acceso directo futuro desde Supabase client.
- **Cliente publico:** no accede directo a tablas sensibles. Catalogo publico puede servirse por Server Components/Route Handlers o vistas read-only.
- **Webhooks:** nunca dependen de cookies; validan firma, guardan evento idempotente y responden `200` despues de registrar resultado.

Tablas candidatas a lectura publica controlada:

- `Product`, `ProductVariant`, `ProductImage`, `Category`, solo productos/variantes activos/publicados.

Tablas solo backend/admin:

- `Payment`, `MercadoPagoWebhookEvent`, `StockMovement`, `CashRegisterSession`, `CashMovement`, `CustomerLedgerEntry`, `PurchaseOrder`, `AuditLog`.

## Archivos modificados en esta fase

- `prisma/schema.prisma`: schema expandido para ecommerce + POS.

## Comandos ejecutados

```bash
npx prisma format
npm run db:generate
npm run db:push
npm run db:seed
npm run db:backfill:variants
```

El schema ya fue aplicado en Supabase y se genero una variante default para los productos existentes.

## Tests sugeridos

- Generacion de `internalSku` unico para variantes.
- Stock negativo permitido y `StockMovement.stockAfter` consistente.
- Pedido Mercado Pago idempotente usando `MercadoPagoWebhookEvent.eventKey`.
- Bloqueo de cuenta corriente cuando `debtAccumulated + venta > creditLimit`.
- Cierre de caja con diferencia calculada.
- Recepcion de orden de compra actualiza stock y costo de variante.

## Checklist de validacion manual

- `npm run db:generate` termina sin errores.
- Prisma Studio o Supabase muestran los nuevos modelos despues de `db:push`.
- Los productos actuales siguen teniendo `priceCents`, `stock` y `sku` para no romper el catalogo existente.
- Cada variante tiene `internalSku`, precio, costo y stock propio.
- `Order`, `Payment`, `Shipment` y `MercadoPagoWebhookEvent` cubren el flujo Mercado Pago + envio.
- `Sale`, `CashRegisterSession` y `CashMovement` cubren el POS.

## Riesgos y pendientes

- Definir costo final para rentabilidad: por ahora el schema soporta costo actual por variante; FIFO/promedio requeriria capas adicionales.
- Crear migracion/backfill para convertir productos actuales en una variante default.
- Implementar Zod schemas y servicios antes de conectar UI.
- Validar firma exacta de Mercado Pago contra docs oficiales: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/notifications/webhooks
- Validar endpoints Andreani contra docs oficiales/credenciales del cliente antes de codificar integracion real.
