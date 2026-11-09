"use client";

import { createContext, useContext } from "react";
import { DATASETS, type ProtoData } from "./protoData";

export const ProtoDataContext = createContext<ProtoData>(DATASETS.demo);
export const useProtoData = () => useContext(ProtoDataContext);
