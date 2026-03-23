"use client";

import ReactMarkdown from "react-markdown";

interface MarkdownProps {
  content: string;
  className?: string;
}

/**
 * Renders LLM markdown output as styled HTML with glassmorphism aesthetic.
 */
export function Markdown({ content, className = "" }: MarkdownProps) {
  return (
    <div className={`max-w-none ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-semibold text-white mt-6 mb-3 first:mt-0 skeuo-emboss">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-white mt-5 mb-2 skeuo-emboss">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-medium text-zinc-200 mt-4 mb-2">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-medium text-zinc-300 mt-3 mb-1">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="text-zinc-300 leading-7 text-sm mb-3 last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <span className="text-white font-semibold">{children}</span>
          ),
          em: ({ children }) => (
            <span className="text-zinc-400 italic">{children}</span>
          ),
          ul: ({ children }) => (
            <ul className="space-y-1.5 my-3 ml-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-1.5 my-3 ml-1 list-decimal list-inside">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-zinc-300 text-sm leading-relaxed flex gap-2">
              <span className="text-zinc-600 mt-1.5 shrink-0">•</span>
              <span>{children}</span>
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-white/[0.08] pl-4 my-3 text-zinc-400 italic bg-white/[0.02] rounded-r-lg py-2 pr-3">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="text-amber-400 bg-white/[0.05] border border-white/[0.06] px-1.5 py-0.5 rounded-md text-xs font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]">
              {children}
            </code>
          ),
          hr: () => <hr className="border-white/[0.06] my-5" />,
          a: ({ href, children }) => (
            <a href={href} className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
