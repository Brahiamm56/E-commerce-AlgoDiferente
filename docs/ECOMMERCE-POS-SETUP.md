# Ecommerce + POS - Fase 2 Setup base

## Resumen ejecutivo

La base tecnica queda preparada para seguir con catalogo, checkout, POS y admin sin cambiar el stack. Se agregan dependencias de Supabase, Mercado Pago y Prettier; se documentan variables de entorno; se centralizan helpers de Supabase, Mercado Pago y Andreani; y se mantiene Prisma 7 contra Supabase Postgres con adapter `pg`.

## Decisiones de diseno

- **Prisma + Supabase Postgres:** runtime y scripts usan `DATABASE_URL`. Si mas adelante se usa pooler de Supabase, `DIRECT_URL` queda documentado para migraciones.
- **Supabase Auth preparado, no activado en UI:** se agregan clientes `supabase/admin` y `supabase/client` para fases siguientes.
- **Mercado Pago via SDK oficial:** `mercadopago` queda instalado y el cliente se centraliza en `src/lib/integrations/mercadopago.ts`.
- **Andreani sin endpoints inventados:** se crea solo config typed por env. Los endpoints exactos se implementan despues de validar la doc/credenciales oficiales.
- **Cloudinary se mantiene:** `src/lib/cloudinary.ts` sigue siendo la integracion de imagenes.
- **Prettier agregado:** no reemplaza ESLint; suma chequeo de formato para mantener consistencia.

## Archivos relevantes

- `.env.example`: plantilla completa sin secretos.
- `.prettierrc.json`: reglas de formato.
- `.prettierignore`: exclusiones de formato.
- `package.json`: scripts `format` y `format:write`, dependencias de Supabase/Mercado Pago/Prettier.
- `src/lib/env.ts`: checklist ampliado para Supabase, Mercado Pago, Andreani y POS.
- `src/lib/supabase/admin.ts`: cliente server-side con service role.
- `src/lib/supabase/client.ts`: cliente browser con anon key.
- `src/lib/integrations/mercadopago.ts`: cliente SDK y URLs base.
- `src/lib/integrations/andreani.ts`: config centralizada.

## Variables de entorno nuevas

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
MERCADO_PAGO_ENV
MERCADO_PAGO_ACCESS_TOKEN
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY
MERCADO_PAGO_WEBHOOK_SECRET
MERCADO_PAGO_SUCCESS_URL
MERCADO_PAGO_FAILURE_URL
MERCADO_PAGO_PENDING_URL
ANDREANI_ENV
ANDREANI_API_URL
ANDREANI_CLIENT_ID
ANDREANI_CLIENT_SECRET
ANDREANI_CONTRACT_NUMBER
LOCAL_COURIER_ENABLED
LOCAL_COURIER_FIXED_COST
POS_CARD_SURCHARGE_PERCENT
POS_RECEIPT_WIDTH_MM
```

## Comandos ejecutados

```bash
npm install @supabase/supabase-js @supabase/ssr mercadopago
npm install -D prettier
npm install server-only
```

## Comandos recomendados

```bash
npm run db:generate
npm run lint
npm run format
npm run build
```

## Tests sugeridos

- `createSupabaseAdminClient` falla si falta `SUPABASE_SERVICE_ROLE_KEY`.
- `getMercadoPagoClient` falla si falta `MERCADO_PAGO_ACCESS_TOKEN`.
- `getMercadoPagoNotificationUrl` genera URL absoluta con `NEXT_PUBLIC_APP_URL`.
- `getAndreaniConfig` falla si faltan credenciales.
- `getEnvironmentChecklist` marca cada grupo correctamente.

## Checklist de validacion manual

- `.env.example` no contiene secretos reales.
- `.env` local tiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `npm run db:generate` sigue funcionando.
- `npm run lint` no reporta errores por imports nuevos.
- `npm run format` puede ejecutarse sin formatear `package-lock.json`.

## Riesgos / pendientes

- Faltan credenciales reales de Mercado Pago y Andreani.
- El proyecto todavia usa NextAuth Credentials para admin; Supabase Auth se integra en una fase posterior.
- Si se usa Supabase pooler, hay que definir politica `DATABASE_URL`/`DIRECT_URL` antes de produccion.
- `npm audit` sigue reportando vulnerabilidades moderadas que requieren `--force`; no conviene aplicarlo sin revisar impacto.