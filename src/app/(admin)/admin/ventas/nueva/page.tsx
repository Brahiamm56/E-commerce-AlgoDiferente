import { redirect } from "next/navigation";

// Legacy route kept for old bookmarks; sales are now handled in POS.
export default function NuevaVentaPage() {
  redirect("/admin/pos");
}
