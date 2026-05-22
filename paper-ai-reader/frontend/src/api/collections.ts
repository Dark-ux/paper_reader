import { request } from "./client";
import type { Collection } from "../types/paper";

export function listCollections() {
  return request<Collection[]>("/collections");
}

export function createCollection(payload: {
  name: string;
  description?: string | null;
  parent_id?: number | null;
}) {
  return request<Collection>("/collections", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
