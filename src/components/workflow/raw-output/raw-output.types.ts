/** Count authored lines without inspecting or guessing the output outcome. */
export function outputExtent(output: string): string {
  const count = output === "" ? 0 : output.split(/\r\n|\r|\n/u).length;
  return `${count} ${count === 1 ? "line" : "lines"}`;
}
