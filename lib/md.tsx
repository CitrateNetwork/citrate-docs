"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { Icon } from "@/components/icons";

/**
 * Citrate Atlas markdown renderer. Real GFM (tables, code, nested lists, anchors) via react-markdown +
 * remark-gfm. Fenced code gets a language label and a copy button; ```mermaid blocks render as diagrams.
 * The leading H1 is stripped so the page title (rendered by the reader chrome) never prints twice. Used by
 * both the docs reader and Ask Atlas.
 */

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200); }}
      title="Copy"
      style={{
        position: "absolute", top: 6, right: 6, padding: 4, borderRadius: 6,
        background: "var(--bg-2)", border: "1px solid var(--border-1)", color: "var(--fg-3)", lineHeight: 0,
      }}
    >
      <Icon name={done ? "check" : "copy"} size={14} />
    </button>
  );
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  return (
    <div className="code-block" translate="no">
      {lang && lang !== "text" && <span className="code-block-lang">{lang}</span>}
      <CopyButton text={code} />
      <pre><code>{code}</code></pre>
    </div>
  );
}

/** Render a ```mermaid block as a diagram. Mermaid is dynamically imported (kept out of the main bundle),
 *  theme-matched to the active data-theme, and sandboxed (securityLevel: strict) since the source can come
 *  from the model. On a parse error (e.g. an incomplete diagram) it falls back to the raw code block. */
let mermaidSeq = 0;
function Mermaid({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        const dark = document.documentElement.dataset.theme !== "light";
        mermaid.initialize({
          startOnLoad: false,
          theme: dark ? "dark" : "neutral",
          securityLevel: "strict",
          fontFamily: "var(--font-sans)",
        });
        mermaidSeq += 1;
        const id = `mmd-${mermaidSeq}`;
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  if (failed) return <CodeBlock lang="mermaid" code={code} />;
  return <div className="mermaid-diagram" ref={ref} aria-label="diagram" />;
}

/** Drop a single leading H1 (the reader chrome shows the title). */
export function stripLeadingH1(md: string): string {
  return md.replace(/^﻿?\s*#[^\n#][^\n]*\n+/, "");
}

export function Markdown({ source }: { source: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code({ className, children }) {
            const m = /language-(\w+)/.exec(className || "");
            const text = String(children).replace(/\n$/, "");
            if (!m) return <code className="md-code" translate="no">{children}</code>;
            if (m[1] === "mermaid") return <Mermaid code={text} />;
            return <CodeBlock lang={m[1]} code={text} />;
          },
          a: ({ href, children }) => (
            <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel={href?.startsWith("http") ? "noreferrer" : undefined}>
              {children}
            </a>
          ),
          // Screenshots + diagrams: render inside a framed figure, using the alt
          // text as the caption. Assets live under /public and stay outside Next
          // image optimization on purpose (static, versioned docs assets).
          img: ({ src, alt }) => (
            <figure className="md-figure">
              <img src={typeof src === "string" ? src : ""} alt={alt || ""} loading="lazy" decoding="async" />
              {alt ? <figcaption>{alt}</figcaption> : null}
            </figure>
          ),
        }}
      >
        {stripLeadingH1(source)}
      </ReactMarkdown>
    </div>
  );
}
