import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://demo:demo@localhost:5432/demo";
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: process.env.NODE_ENV === "production",
  },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@demo.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin123*";

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Administrador",
      passwordHash: await hash(adminPassword, 10),
      role: "owner",
    },
  });

  const catTech = await prisma.category.upsert({
    where: { slug: "tecnologia" },
    update: { name: "Tecnología", description: "Última generación en dispositivos y gadgets." },
    create: { name: "Tecnología", slug: "tecnologia", description: "Última generación en dispositivos y gadgets.", order: 1 },
  });

  const catShoes = await prisma.category.upsert({
    where: { slug: "zapatillas" },
    update: { name: "Zapatillas", description: "Sneakers exclusivos y de colección." },
    create: { name: "Zapatillas", slug: "zapatillas", description: "Sneakers exclusivos y de colección.", order: 2 },
  });

  const seedProducts = [
    // --- Tecnología ---
    {
      name: "iPhone 15 Pro 256GB",
      slug: "iphone-15-pro-256",
      desc: "Teléfono premium con chip A17 Pro, diseño en titanio y cámara de 48MP.",
      price: 5499000,
      catId: catTech.id,
      img: "https://images.unsplash.com/photo-1695048064976-599298cafa7c?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "MacBook Pro 14 M3",
      slug: "macbook-pro-14-m3",
      desc: "Computadora portátil para profesionales, chip M3 Pro y pantalla Liquid Retina XDR.",
      price: 8999000,
      catId: catTech.id,
      img: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "AirPods Pro Segunda Generación",
      slug: "airpods-pro-2",
      desc: "Auriculares inalámbricos con cancelación activa de ruido avanzada y audio espacial.",
      price: 1199000,
      catId: catTech.id,
      img: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "Apple Watch Series 9",
      slug: "apple-watch-s9",
      desc: "Reloj inteligente con control de gestos y monitoreo avanzado de salud.",
      price: 1899000,
      catId: catTech.id,
      img: "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "Sony WH-1000XM5",
      slug: "sony-wh1000xm5",
      desc: "Audífonos de diadema inalámbricos con la mejor cancelación de ruido de la industria.",
      price: 1450000,
      catId: catTech.id,
      img: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "iPad Air M1",
      slug: "ipad-air-m1",
      desc: "Tablet ultraligera perfecta para creatividad, cuenta con soporte para Apple Pencil.",
      price: 2899000,
      catId: catTech.id,
      img: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "Samsung PlayStation 5",
      slug: "ps5-console",
      desc: "Consola de videojuegos de última generación con carga ultrarrápida y controles adaptativos.",
      price: 2499000,
      catId: catTech.id,
      img: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "Nintendo Switch OLED",
      slug: "nintendo-switch-oled",
      desc: "Consola híbrida con pantalla OLED de colores vibrantes para jugar donde sea.",
      price: 1549000,
      catId: catTech.id,
      img: "https://images.unsplash.com/photo-1617396900799-f4c9243063f6?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "Logitech MX Master 3S",
      slug: "logitech-mx-master-3s",
      desc: "Mouse ergonómico de alta precisión ideal para diseñadores y programadores.",
      price: 450000,
      catId: catTech.id,
      img: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "Teclado Keychron K2",
      slug: "teclado-keychron-k2",
      desc: "Teclado mecánico inalámbrico, diseño compacto perfecto para cualquier setup.",
      price: 380000,
      catId: catTech.id,
      img: "https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "Galaxy S24 Ultra",
      slug: "galaxy-s24-ultra",
      desc: "Smartphone insignia de Samsung con avanzadas capacidades de IA y S-Pen integrado.",
      price: 5299000,
      catId: catTech.id,
      img: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "Dron DJI Mini 3 Pro",
      slug: "dji-mini-3-pro",
      desc: "Dron ligero, plegable y con cámara 4K, ideal para creadores de contenido viajando.",
      price: 3100000,
      catId: catTech.id,
      img: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1200&q=80",
    },

    // --- Zapatillas ---
    {
      name: "Nike Air Force 1 '07",
      slug: "nike-air-force-1",
      desc: "El diseño icónico y clásico urbano con tecnología Nike Air de amortiguación.",
      price: 499900,
      catId: catShoes.id,
      img: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "Air Jordan 1 Retro High",
      slug: "air-jordan-1-high",
      desc: "La silueta que cambió la cultura de los sneakers. Todo un histórico del baloncesto.",
      price: 799900,
      catId: catShoes.id,
      img: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "Nike Dunk Low Panda",
      slug: "nike-dunk-low-panda",
      desc: "Uno de los modelos más deseados y versátiles, combinando blanco y negro a la perfección.",
      price: 549900,
      catId: catShoes.id,
      img: "https://images.unsplash.com/photo-1542280281-115f403565bc?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "Adidas Yeezy Boost 350 V2",
      slug: "yeezy-boost-350-v2",
      desc: "Silueta revolucionaria diseñada por Kanye West, con amortiguación Boost ultrasuave.",
      price: 1100000,
      catId: catShoes.id,
      img: "https://images.unsplash.com/photo-1603502846985-780c16922cc5?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "New Balance 550",
      slug: "new-balance-550",
      desc: "Un clásico del calzado deportivo ochentero traído de vuelta a la actualidad urbana.",
      price: 429900,
      catId: catShoes.id,
      img: "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "Vans Old Skool Clásicas",
      slug: "vans-old-skool",
      desc: "La zapatilla de skate original que ostenta la inconfundible banda lateral de Vans.",
      price: 299900,
      catId: catShoes.id,
      img: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "Converse Chuck Taylor All Star",
      slug: "converse-chuck-taylor",
      desc: "Sencillas, duraderas y perfectas para combinar con cualquier prenda casual.",
      price: 269900,
      catId: catShoes.id,
      img: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "Asics 990v5",
      slug: "asics-990-v5",
      desc: "Excelencia en running con estabilidad incomparable y un diseño atemporal.",
      price: 689900,
      catId: catShoes.id,
      img: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "Nike Air Max 97",
      slug: "nike-air-max-97",
      desc: "Inspiradas en los trenes bala de Japón, proporcionan una pisada suave a máxima velocidad.",
      price: 749900,
      catId: catShoes.id,
      img: "https://images.unsplash.com/photo-1552346154-21d32810baa3?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "Puma Suede Classic",
      slug: "puma-suede-classic",
      desc: "Modelo retro y resistente ideal para la rutina diaria, forrado en ante texturizado.",
      price: 349900,
      catId: catShoes.id,
      img: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "Adidas Samba OG",
      slug: "adidas-samba-og",
      desc: "Zapatillas nacidas en el mundo del entrenamiento en sala, hoy consolidadas en las calles.",
      price: 389000,
      catId: catShoes.id,
      img: "https://images.unsplash.com/photo-1518002171953-a080ee817e1f?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "Reebok Suede Runner",
      slug: "reebok-classic-leather",
      desc: "Líneas pulidas y parte superior de piel de plena flor que te brindan soporte cómodo.",
      price: 369900,
      catId: catShoes.id,
      img: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=1200&q=80",
    },
  ];

  for (const item of seedProducts) {
    const p = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        description: item.desc,
        priceCents: item.price,
        categoryId: item.catId,
      },
      create: {
        name: item.name,
        slug: item.slug,
        description: item.desc,
        priceCents: item.price,
        stock: 10,
        featured: true,
        status: "PUBLISHED",
        categoryId: item.catId,
      },
    });

    const hasImages = await prisma.productImage.findFirst({ where: { productId: p.id } });
    if (!hasImages) {
      await prisma.productImage.create({
        data: {
          productId: p.id,
          url: item.img,
          alt: item.name,
          sortOrder: 1,
        },
      });
    }
  }

  await prisma.setting.upsert({
    where: { key: "store" },
    update: {},
    create: {
      key: "store",
      value: {
        name: "Studio Catalog",
        description: "Tienda catálogo con checkout por WhatsApp.",
        whatsappNumber: "573001234567",
        currency: "COP",
        themeAccent: "#7c3aed",
        themeAccentStrong: "#5b21b6",
        themeBackground: "#f7f4fb",
        themeCardBg: "#ffffff",
        themeCardBorder: "#e7e0f2",
        themeCardRadius: "xl",
        themeButtonRadius: "full",
      },
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });