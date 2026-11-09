"use client";

import { createContext, useContext } from "react";
import { DATASETS, type ProtoData } from "./protoData";

export const ProtoDataContext = createContext<ProtoData>(DATASETS.demo);
export const useProtoData = () => useContext(ProtoDataContext);

export const ProtoStateContext = createContext("");
export const useProtoState = () => useContext(ProtoStateContext);

// Lets a screen follow a flow-map path to another screen of the prototype.
export const goToScreen = (screen: string) => parent.postMessage({ type: "go", screen }, location.origin);
