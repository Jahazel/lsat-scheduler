"use client";

import type { ComponentType } from "react";
import RelatedRail from "./sections/ai/RelatedRail";

export const SECTION_LABEL = "Approved design";

export const VARIANTS: { name: string; Component: ComponentType }[] = [{ name: "Approved design", Component: RelatedRail }];

export const clampVariant = (variant: number) => Math.min(Math.max(variant || 1, 1), VARIANTS.length);
