export function extractCleanSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return {
      text: "",
      hasRuby: false
    };
  }

  const fragment = selection.getRangeAt(0).cloneContents();
  const hasRuby = fragment.querySelector("ruby, rt, rp") !== null;
  fragment.querySelectorAll("rt, rp").forEach((node) => node.remove());

  const text = (fragment.textContent || "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    text,
    hasRuby
  };
}
