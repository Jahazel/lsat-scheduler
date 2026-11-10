"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { LegalPage } from "./content";
import CalmProse from "./sections/body/CalmProse";

export const BodyContext = createContext<(page: LegalPage) => ReactNode>((page) => <CalmProse page={page} />);
export const useBody = () => useContext(BodyContext);
