"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import {
  pricingComparisonRows,
  type PricingCell,
} from "@/lib/constants/marketing-pricing";
import { cn } from "@/lib/utils";

function CellValue({ cell }: { cell: PricingCell }) {
  if (cell.kind === "check") {
    return (
      <Check
        className="mx-auto h-5 w-5 text-[color:var(--mode-review)]"
        strokeWidth={2.5}
        aria-label="Included"
      />
    );
  }
  if (cell.kind === "dash") {
    return (
      <span className="text-lg font-medium text-muted/45" aria-label="Not included">
        —
      </span>
    );
  }
  return (
    <span className="font-display text-lg font-semibold tabular-nums tracking-tight text-foreground">
      {cell.value}
    </span>
  );
}

export function PricingComparisonTable({
  className,
}: {
  className?: string;
}) {
  const universal = pricingComparisonRows.filter((r) => r.universal);
  const differentiating = pricingComparisonRows.filter((r) => !r.universal);

  return (
    <div className={cn("space-y-8", className)}>
      {universal.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className="rounded-2xl border border-border/70 bg-surface/50 px-4 py-4 sm:px-6"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Included in every plan
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {universal.map((row) => (
              <li
                key={row.label}
                className="flex items-start gap-2 text-sm text-foreground/85"
              >
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--mode-review)]"
                  strokeWidth={2.5}
                  aria-hidden
                />
                <span>{row.label}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Desktop / tablet: full 4-col table */}
      <motion.div
        className="hidden overflow-hidden rounded-2xl border border-border bg-surface/70 md:block"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ type: "spring", stiffness: 110, damping: 18, delay: 0.06 }}
      >
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-surface-raised/40">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted sm:px-5">
                Feature
              </th>
              <th className="w-[18%] px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Free
              </th>
              <th className="w-[18%] px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Plus
              </th>
              <th className="w-[18%] px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Pro
              </th>
            </tr>
          </thead>
          <tbody>
            {differentiating.map((row, index) => (
              <tr
                key={row.label}
                className={cn(
                  "border-b border-border/70 last:border-0",
                  index % 2 === 1 && "bg-foreground/[0.02]"
                )}
              >
                <th
                  scope="row"
                  className="px-4 py-3.5 text-sm font-medium text-foreground sm:px-5"
                >
                  {row.label}
                </th>
                <td className="px-3 py-3.5 text-center">
                  <CellValue cell={row.free} />
                </td>
                <td className="px-3 py-3.5 text-center">
                  <CellValue cell={row.plus} />
                </td>
                <td className="px-3 py-3.5 text-center">
                  <CellValue cell={row.pro} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Mobile: horizontally scrollable with sticky feature labels */}
      <motion.div
        className="md:hidden"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ type: "spring", stiffness: 110, damping: 18, delay: 0.06 }}
      >
        <p className="mb-2 text-xs text-muted">Swipe sideways to compare tiers</p>
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface/70 [-webkit-overflow-scrolling:touch]">
          <table className="w-max min-w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-surface-raised/40">
                <th className="sticky left-0 z-[1] min-w-[11rem] bg-surface-raised/95 px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted backdrop-blur-sm">
                  Feature
                </th>
                <th className="min-w-[4.5rem] px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Free
                </th>
                <th className="min-w-[4.5rem] px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Plus
                </th>
                <th className="min-w-[4.5rem] px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Pro
                </th>
              </tr>
            </thead>
            <tbody>
              {differentiating.map((row, index) => (
                <tr
                  key={row.label}
                  className={cn(
                    "border-b border-border/70 last:border-0",
                    index % 2 === 1 && "bg-foreground/[0.02]"
                  )}
                >
                  <th
                    scope="row"
                    className={cn(
                      "sticky left-0 z-[1] max-w-[11rem] px-3 py-3 text-left text-xs font-medium text-foreground backdrop-blur-sm",
                      index % 2 === 1 ? "bg-background/95" : "bg-surface/95"
                    )}
                  >
                    {row.label}
                  </th>
                  <td className="px-3 py-3 text-center">
                    <CellValue cell={row.free} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <CellValue cell={row.plus} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <CellValue cell={row.pro} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
