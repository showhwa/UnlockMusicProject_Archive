export function cleanFilename(filename: string): string {
  return filename
    .replace(/\.[a-z\d]{3,6}$/, '') // Remove file extension
    .replace(/\.(mgg|kgg|mflac)\d*$/, '') // Remove extra mgg/kgg/mflac extension
    .replace(/\s?\[mq[a-z\d]*\]\s*$/, ''); // Remove " [mqms*]" suffix
}
