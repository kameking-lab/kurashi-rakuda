// JSONフロントマター（--- ... --- で囲んだJSONオブジェクト）のパーサ。
// safe-ai-site は YAML/TS 混在だったが、依存ゼロで機械照合しやすいよう本サイトはJSON frontmatterに統一する。
export function parseArticle(raw) {
  const text = raw.replace(/\r\n/g, "\n");
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error("frontmatter not found: expected '---\\n{ JSON }\\n---\\n' at file start");
  }
  let frontmatter;
  try {
    frontmatter = JSON.parse(match[1]);
  } catch (e) {
    throw new Error(`frontmatter JSON parse error: ${e.message}`);
  }
  const body = match[2].trim();
  return { frontmatter, body };
}
