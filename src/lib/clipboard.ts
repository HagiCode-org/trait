export async function copyText(value: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      // Fall back to the DOM copy path in restricted environments.
    }
  }

  return copyTextWithDomFallback(value)
}

export function copyTextWithDomFallback(value: string, doc?: Document): boolean {
  const activeDocument = doc ?? (typeof document === "undefined" ? undefined : document)
  if (!activeDocument || !activeDocument.body || typeof activeDocument.execCommand !== "function") {
    return false
  }

  const textarea = activeDocument.createElement("textarea")
  textarea.value = value
  textarea.setAttribute("readonly", "")
  textarea.setAttribute("aria-hidden", "true")
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  textarea.style.inset = "0"
  textarea.style.pointerEvents = "none"

  activeDocument.body.appendChild(textarea)

  try {
    textarea.focus()
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)
    return activeDocument.execCommand("copy")
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}
