import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VEHICLES } from "@/data/vehicles";
import ExhibitPage from "@/components/exhibit/exhibit-page";

export function generateStaticParams() {
  return VEHICLES.map((v) => ({ id: v.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const index = VEHICLES.findIndex((v) => v.id === id);
  if (index < 0) return { title: "Exhibit" };
  const vehicle = VEHICLES[index];
  return {
    title: `${vehicle.displayName} — Exhibit ${String(index + 1).padStart(2, "0")}`,
    description: vehicle.story,
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!VEHICLES.some((v) => v.id === id)) notFound();
  return <ExhibitPage id={id} />;
}
