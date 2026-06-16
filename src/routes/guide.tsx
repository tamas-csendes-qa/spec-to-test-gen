import { createFileRoute } from "@tanstack/react-router";
import { GuidePage } from "@/pages/GuidePage";

export const Route = createFileRoute("/guide")({
  component: GuidePage,
  head: () => ({
    meta: [{ title: "QAgen – Felhasználói útmutató" }],
  }),
});
