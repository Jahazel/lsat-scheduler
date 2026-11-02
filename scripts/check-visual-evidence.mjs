import { readFileSync } from "node:fs";

const skipLabel = "no-visual-change";

function isScreenFile(file) {
  if (file.endsWith(".css")) return true;
  return /^src\/(app|components)\/.+\.tsx$/.test(file) && !file.endsWith(".test.tsx");
}

function hasPicture(body) {
  const visible = body.replace(/<!--[\s\S]*?-->/g, "");
  return (
    visible.includes("https://github.com/user-attachments/") ||
    /!\[[^\]]*\]\([^)]+\)/.test(visible) ||
    /<(img|video)\b/i.test(visible)
  );
}

const files = readFileSync(0, "utf8").split("\n").filter(Boolean);
const body = process.env.PR_BODY;
const labels = JSON.parse(process.env.PR_LABELS);
const screenFiles = files.filter(isScreenFile);

if (screenFiles.length === 0) {
  console.log("No screen files changed. No picture needed.");
} else if (labels.includes(skipLabel)) {
  console.log(`The ${skipLabel} label is set. No picture needed.`);
} else if (hasPicture(body)) {
  console.log("The PR body shows a picture of the screen change.");
} else {
  console.error(`This PR changes screen files but its body shows no picture:\n`);
  for (const file of screenFiles) console.error(`  ${file}`);
  console.error(`\nAttach screen-sized screenshots of the changed screens: gh pr edit ${process.env.PR_NUMBER} --attach ./shot.png`);
  console.error(`If the screens look the same (for example, a rename), add the ${skipLabel} label instead.`);
  process.exitCode = 1;
}
