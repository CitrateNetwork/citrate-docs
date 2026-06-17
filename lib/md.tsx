"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { Icon } from "@/components/icons";

/**
 * Citrate Atlas markdown renderer. Real GFM (tables, code, nested lists, anchors) via react-markdown +
 * remark-gfm. Code blocks get a language label and a copy button. The leading H1 is stripped so the page
 * title (rendered by the reader chrome) never prints twice.
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
    <div className="code-block">
      {lang && lang !== "text" && <span className="code-block-lang">{lang}</span>}
      <CopyButton text={code} />
      <pre><code>{code}</code></pre>
    </div>
  );
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
            if (!m) return <code className="md-code">{children}</code>;
            return <CodeBlock lang={m[1]} code={text} />;
          },
          a: ({ href, children }) => (
            <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel={href?.startsWith("http") ? "noreferrer" : undefined}>
              {children}
            </a>
          ),
        }}
      >
        {stripLeadingH1(source)}
      </ReactMarkdown>
    </div>
  );
}
