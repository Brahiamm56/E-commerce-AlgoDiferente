# Ecommerce + POS - Fases 4 a 9

## Resumen ejecutivo

Se implemento una base funcional end-to-end para checkout web, Mercado Pago, webhook idempotente, admin de variantes/stock, POS con caja, clientes con cuenta corriente, proveedores con ordenes de compra y reportes de rentabilidad. El objetivo de esta tanda fue dejar los flujos reales conectados al schema existente sin cambiar de stack ni inventar endpoints externos.

## Fase 4 - Checkout + Mercado Pago + Andreani

### Incluye

- Pagina `/checkout` con datos de cliente, entrega y resumen de carrito.
- API `POST /api/checkout` que crea `Order`, `OrderItem`, `Payment` y `Shipment`.
- Preference de Mercado Pago si las credenciales estan configuradas.
- Webhook `/api/webhooks/mercadopago` con validacion HMAC, idempotencia por evento, consulta del pago al SDK y actualizacion de estado.
- Descuento de stock al pasar el pago a aprobado.

### Trade-offs

- Andreani queda como `Shipment` cotizado/pediente de verificacion oficial. No se codifican endpoints hasta validar la documentacion y credenciales reales.
- Si falta `MERCADO_PAGO_ACCESS_TOKEN`, el pedido se crea y queda listo, pero no redirige al pago.

## Fase 5 - Admin productos, variantes y stock

### Incluye

- Nueva pantalla `/admin/variantes`.
- Edicion de stock y costo por variante.
- `StockMovement` de tipo `ADJUSTMENT` y `AuditLog` por cada ajuste.
- Recalculo del stock agregado del producto padre.

## Fase 6 - POS fisico

### Incluye

- Nueva pantalla `/admin/pos`.
- Apertura y cierre de caja diaria.
- Terminal tactil con busqueda por nombre, talle/color o SKU interno.
- Metodos de pago: efectivo, transferencia, tarjeta de credito y cuenta corriente.
- Recargo configurable por tarjeta via `POS_CARD_SURCHARGE_PERCENT`.
- Ticket interno persistido como `InternalReceipt`.
- Movimiento de caja y stock por venta.

### Limitacion conocida

- La impresion termica queda como comprobante interno persistido. Para impresion silenciosa ESC/POS por USB hace falta app/puente local o integracion especifica fuera del navegador.

## Fase 7 - Clientes y cuentas corrientes

### Incluye

- Nueva pantalla `/admin/clientes`.
- Alta/actualizacion por telefono unico.
- Limite de credito.
- Bloqueo de venta POS a cuenta corriente si supera el limite.
- Pago de deuda con `CustomerLedgerEntry`, `Payment`, `InternalReceipt` y movimiento de caja si hay caja abierta.

## Fase 8 - Proveedores y ordenes de compra

### Incluye

- Nueva pantalla `/admin/proveedores`.
- Nueva pantalla `/admin/compras`.
- Creacion de OC por proveedor y variante.
- Recepcion de OC que incrementa stock, actualiza costo unitario y guarda `StockMovement`.
- Vinculo proveedor-variante via `SupplierProduct` con ultimo costo.

### Pendiente productivo

- Generar PDF real de OC. La base de datos y pantallas ya permiten emitir/recibir, pero falta exportador PDF o plantilla imprimible dedicada.

## Fase 9 - Dashboard y reportes

### Incluye

- Nueva pantalla `/admin/reportes`.
- KPIs: ventas dia/semana/mes, productos vendidos, margen.
- Grafico de ventas por dia.
- Ranking de medios de pago.
- Top productos vendidos y top productos por rentabilidad.
- Rentabilidad calculada con `unitCost` snapshot de venta/pedido.

## Archivos principales

- `src/schemas/checkout.ts`
- `src/lib/services/checkout-service.ts`
- `src/lib/services/mercadopago-webhook-service.ts`
- `src/app/api/checkout/route.ts`
- `src/app/api/webhooks/mercadopago/route.ts`
- `src/components/shop/checkout-client.tsx`
- `src/actions/stock.ts`
- `src/actions/pos.ts`
- `src/actions/customers.ts`
- `src/actions/suppliers.ts`
- `src/actions/purchase-orders.ts`
- `src/lib/reports.ts`
- `src/components/admin/reports-charts.tsx`

## Validacion ejecutada

```bash
npx tsc --noEmit
npm run lint
```

## Tests criticos sugeridos

- Checkout crea pedido con variantes y no confia en precios del cliente.
- Preference Mercado Pago contiene `external_reference`, `back_urls` y `notification_url`.
- Webhook duplicado no descuenta stock dos veces.
- Venta POS con tarjeta aplica recargo configurado.
- Venta POS a cuenta corriente bloquea cuando supera limite.
- Recepcion de OC incrementa stock y actualiza costo de variante.
- Reportes calculan margen con costo snapshot.

## Checklist manual

- Agregar producto al carrito e ingresar a `/checkout`.
- Crear pedido con retiro, remis local y Andreani.
- Revisar el pedido en Supabase/Prisma con items, pago y shipment.
- Abrir caja en `/admin/pos`, vender una variante y verificar stock.
- Crear cliente con limite bajo y probar bloqueo de cuenta corriente.
- Crear proveedor, generar OC y recepcionar mercaderia.
- Revisar `/admin/reportes` despues de ventas/recepciones.

## Riesgos pendientes

- Validar firma exacta de Mercado Pago contra docs oficiales antes de produccion final.
- Validar API Andreani real para cotizacion y etiquetas.
- Agregar tests automatizados para webhook, stock y cuenta corriente.
- Definir exportador PDF/impresion para OC y tickets termicos.
- Si Vercel limita webhooks largos, mover trabajo pesado a cola/worker o Supabase Edge Function.