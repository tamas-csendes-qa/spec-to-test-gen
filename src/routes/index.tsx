import { createFileRoute } from "@tanstack/react-router";
import { QAgen } from "@/components/QAgen";

export const Route = createFileRoute("/")({
  component: QAgen,
  head: () => ({
    meta: [
      { title: "QAgen – Tesztesetek generálása specifikációból" },
      {
        name: "description",
        content:
          "QAgen: tölts fel egy specifikációt és generálj Gherkin vagy Zephyr XLSX teszteseteket másodpercek alatt.",
      },
    ],
  }),
});
