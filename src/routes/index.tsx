import { createFileRoute } from "@tanstack/react-router";
import { LibraryPreview } from "@/components/library-preview";

export const Route = createFileRoute("/")({ component: LibraryPreview });
