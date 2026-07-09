/**
 * MarkdownContent — lightweight Markdown renderer using CSS.
 * No heavy deps — just styled pre/code blocks and basic formatting.
 * For production, swap with react-markdown + rehype-highlight.
 */
export default function MarkdownContent({ content, style = {} }) {
  if (!content) return null;

  // Very lightweight markdown → HTML (handles code blocks + basic formatting)
  const html = content
    // Code blocks: ```lang\n...\n```
    .replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="md-code-block" data-lang="${lang || ""}"><code>${escapeHtml(code.trim())}</code></pre>`
    )
    // Inline code: `code`
    .replace(/`([^`\n]+)`/g, "<code class=\"md-inline-code\">$1</code>")
    // Bold: **text**
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    // Italic: *text*
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    // Headers: ## and ###
    .replace(/^### (.+)$/gm, "<h4 class=\"md-h4\">$1</h4>")
    .replace(/^## (.+)$/gm,  "<h3 class=\"md-h3\">$1</h3>")
    .replace(/^# (.+)$/gm,   "<h2 class=\"md-h2\">$1</h2>")
    // Bullet lists: - item
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul class=\"md-ul\">$1</ul>")
    // Numbered lists: 1. item
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    // Line breaks
    .replace(/\n\n/g, "</p><p class=\"md-p\">")
    .replace(/\n/g, "<br/>");

  return (
    <>
      <style>{`
        .md-root { color: var(--text-secondary); line-height: 1.7; }
        .md-root h2.md-h2, .md-root h3.md-h3, .md-root h4.md-h4 {
          color: var(--text-primary); margin: 16px 0 8px; font-weight: 700;
        }
        .md-root h2.md-h2 { font-size: 17px; }
        .md-root h3.md-h3 { font-size: 15px; }
        .md-root h4.md-h4 { font-size: 14px; color: var(--color-brand); }
        .md-root p.md-p   { margin: 8px 0; }
        .md-root ul.md-ul { margin: 6px 0 6px 20px; padding: 0; list-style: disc; }
        .md-root li       { margin: 3px 0; }
        .md-root code.md-inline-code {
          font-family: var(--font-mono); font-size: 12px;
          background: var(--surface-2); padding: 1px 5px; border-radius: 4px;
          color: var(--color-brand);
        }
        .md-root pre.md-code-block {
          background: var(--surface-2); border: 1px solid var(--surface-border);
          border-radius: 8px; padding: 14px; margin: 10px 0;
          overflow-x: auto; position: relative;
        }
        .md-root pre.md-code-block::before {
          content: attr(data-lang);
          position: absolute; top: 6px; right: 10px;
          font-size: 10px; color: var(--text-muted);
          text-transform: uppercase; letter-spacing: 0.05em;
          font-family: var(--font-mono);
        }
        .md-root pre.md-code-block code {
          font-family: var(--font-mono); font-size: 13px;
          color: var(--text-secondary); white-space: pre;
        }
        .md-root strong { color: var(--text-primary); }
      `}</style>
      <div
        className="md-root"
        style={style}
        dangerouslySetInnerHTML={{ __html: `<p class="md-p">${html}</p>` }}
      />
    </>
  );
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
