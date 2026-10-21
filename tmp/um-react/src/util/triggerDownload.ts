/** Programmatically trigger a browser file download via a temporary anchor. */
export function triggerAnchorDownload(href: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}
