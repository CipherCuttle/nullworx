import { readFile } from "node:fs/promises";
import path from "node:path";
import { ForgeGallery } from "@/components/forge-gallery";
import type { ComponentName, GalleryItem } from "@/lib/forge";
import registry from "@/registry.json";

export default async function Home() {
  const items: GalleryItem[] = await Promise.all(
    registry.items.map(async (item) => ({
      name: item.name as ComponentName,
      title: item.title,
      description: item.description,
      files: await Promise.all(item.files.map(async (file) => ({
        name: path.basename(file.path),
        content: await readFile(path.join(process.cwd(), file.path), "utf8"),
      }))),
    })),
  );

  return <ForgeGallery items={items} />;
}
