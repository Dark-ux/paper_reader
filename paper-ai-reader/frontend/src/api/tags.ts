import { request } from "./client";
import type { Tag } from "../types/paper";

export function listTags() {
  return request<Tag[]>("/tags");
}

export function createTag(payload: { name: string; color?: string }) {
  return request<Tag>("/tags", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
