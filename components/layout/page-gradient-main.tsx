"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { isPageGradientEnabled } from "@/lib/utils/page-gradient";
import { cn } from "@/lib/utils";

type PageGradientMainProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
};

function PageGradientMainInner({ children, className, id }: PageGradientMainProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const gradient = isPageGradientEnabled(pathname, searchParams);

  return (
    <main
      id={id}
      className={cn(className, gradient && "app-page-gradient")}
    >
      {children}
    </main>
  );
}

export function PageGradientMain(props: PageGradientMainProps) {
  return (
    <Suspense
      fallback={
        <main id={props.id} className={props.className}>
          {props.children}
        </main>
      }
    >
      <PageGradientMainInner {...props} />
    </Suspense>
  );
}
