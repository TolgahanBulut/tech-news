"use client";

import dynamic from "next/dynamic";
import type { PaginationMeta } from "@/types";

// next/dynamic with ssr:false must be called from a client module
const Pagination = dynamic(() => import("./Pagination"), {
  ssr: false,
  loading: () => <div className="mt-10 h-9" aria-hidden="true" />,
});

interface Props {
  readonly meta: PaginationMeta;
}

export function PaginationDynamic({ meta }: Props) {
  return <Pagination meta={meta} />;
}