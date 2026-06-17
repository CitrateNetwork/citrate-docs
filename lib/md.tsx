import React from "react";

/**
 * Minimal, dependency-free Markdown renderer for the prototype doc reader.
 * Handles the subset the fixtures use: headings, fenced code, lists, blockquotes, paragraphs, and inline
 * `code` / **bold** / [links](url). The real app (S6) swaps this for MDX + remark/rehype — the component
 * boundary (`<Markdown source=… />`) stays the same.
 */

function slug(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
}

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))/g;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyPrefix}-${i++}`;
    if (tok.startsWith("`")) {
      out.push(<code key={key}>{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith("**")) {
      out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    } else {
      const lm = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok)!;
      out.push(
        <a key={key} href={lm[2]}>
          {lm[1]}
        </a>
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  const nextKey = () => `b${key++}`;

  while (i < lines.length) {
    const line = lines[i];

    // fenced code
    if (line.startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++; // closing fence
      blocks.push(
        <pre key={nextKey()}>
          <code>{buf.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // heading
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const text = h[2];
      const id = slug(text);
      const inner = renderInline(text, id);
      const lvl = h[1].length;
      blocks.push(
        lvl === 1 ? <h1 key={nextKey()} id={id}>{inner}</h1>
        : lvl === 2 ? <h2 key={nextKey()} id={id}>{inner}</h2>
        : <h3 key={nextKey()} id={id}>{inner}</h3>
      );
      i++;
      continue;
    }

    // blockquote
    if (line.startsWith("> ")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) buf.push(lines[i++].slice(2));
      blocks.push(<blockquote key={nextKey()}>{renderInline(buf.join(" "), "bq")}</blockquote>);
      continue;
    }

    // unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^[-*]\s+/, ""));
      blocks.push(
        <ul key={nextKey()}>
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `ul${idx}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) items.push(lines[i++].replace(/^\d+\.\s+/, ""));
      blocks.push(
        <ol key={nextKey()}>
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `ol${idx}`)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // blank
    if (line.trim() === "") {
      i++;
      continue;
    }

    // paragraph (gather consecutive plain lines)
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("```") &&
      !/^#{1,4}\s/.test(lines[i]) &&
      !lines[i].startsWith("> ") &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i])
    ) {
      buf.push(lines[i++]);
    }
    blocks.push(<p key={nextKey()}>{renderInline(buf.join(" "), "p")}</p>);
  }

  return <div className="md">{blocks}</div>;
}
