/** Download text as a file — data URLs avoid Chrome naming blob URLs as UUIDs. */
export function downloadTextFile(content: string, filename: string, mimeType: string) {
  const a = document.createElement("a");
  a.href = `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
