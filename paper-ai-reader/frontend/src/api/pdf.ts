import { apiPath } from "./client";

export function getPdfFileUrl(paperId: number) {
  return apiPath(`/pdf/${paperId}/file`);
}
