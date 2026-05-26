export type SelectionLanguage = {
  sourceLang: "zh" | "en";
  targetLang: "zh" | "en";
};

const chinesePattern = /[\u4e00-\u9fff]/;

export function detectSelectionLanguage(text: string): SelectionLanguage {
  if (chinesePattern.test(text)) {
    return { sourceLang: "zh", targetLang: "en" };
  }
  return { sourceLang: "en", targetLang: "zh" };
}

export function getSelectionAnchor() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const rect = selection.getRangeAt(0).getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return null;
  }

  return {
    x: Math.min(rect.left + rect.width / 2, window.innerWidth - 320),
    y: Math.min(rect.bottom + 12, window.innerHeight - 120)
  };
}
