const COLOUR = /\u001b\[[0-9;?]*[A-Za-z]/g;
const STARTS = /^ ?⨯ |^FATAL\b|^\[auth\]\[error\]|^\[browser\]|^ ?\w*Error: |^\{"event":/;
const CONTINUES = /^(\s{2,}|\t|> |\[auth\]\[(cause|details)\])/;

export function serverErrors(text) {
  const errors = [];
  let current = null;
  for (const line of text.replace(COLOUR, "").split("\n")) {
    if (current && line.trim() && CONTINUES.test(line)) current.push(line);
    else {
      current = STARTS.test(line) ? [line] : null;
      if (current) errors.push(current);
    }
  }
  return errors.map((lines) => lines.join("\n"));
}
