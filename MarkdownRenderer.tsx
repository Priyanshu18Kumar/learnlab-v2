import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-6 text-slate-700 leading-relaxed text-[1.05rem] font-light">
      {parts.map((part, index) => {
        // Handle Code Blocks
        if (part.startsWith('```') && part.endsWith('```')) {
          const match = part.match(/```(\w*)\n([\s\S]*?)```/);
          const language = match ? match[1] : '';
          const code = match ? match[2] : part.slice(3, -3);

          return (
            <div key={index} className="my-8 rounded-2xl overflow-hidden bg-[#0f172a] shadow-xl border border-slate-800 group">
              <div className="px-5 py-3 bg-[#1e293b] border-b border-slate-800 flex justify-between items-center">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]"></div>
                </div>
                {language && (
                  <span className="text-slate-400 text-xs font-mono uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">{language}</span>
                )}
              </div>
              <pre className="p-6 overflow-x-auto">
                <code className="text-[0.9rem] font-mono text-slate-200 leading-loose">{code}</code>
              </pre>
            </div>
          );
        }

        // Handle regular text (basic formatting)
        const paragraphs = part.split('\n\n').filter(p => p.trim() !== '');
        
        return paragraphs.map((paragraph, pIndex) => {
            const renderInline = (text: string) => {
                // Handle bold
                const boldParts = text.split(/(\*\*.*?\*\*)/g);
                return boldParts.map((bp, i) => {
                    if (bp.startsWith('**') && bp.endsWith('**')) {
                        return <strong key={i} className="font-semibold text-slate-900 tracking-wide">{bp.slice(2, -2)}</strong>;
                    }
                    // Handle inline code
                    const codeParts = bp.split(/(`.*?`)/g);
                    return codeParts.map((cp, j) => {
                        if (cp.startsWith('`') && cp.endsWith('`')) {
                             return <code key={`${i}-${j}`} className="px-1.5 py-0.5 mx-0.5 rounded-md bg-blue-50 text-blue-700 font-mono text-[0.9em] border border-blue-100">{cp.slice(1, -1)}</code>;
                        }
                        return <span key={`${i}-${j}`}>{cp}</span>;
                    });
                });
            };

            if (paragraph.trim().startsWith('- ') || paragraph.trim().startsWith('* ')) {
                const items = paragraph.split('\n').filter(i => i.trim() !== '');
                return (
                    <ul key={`${index}-${pIndex}`} className="list-none pl-2 space-y-3 my-6">
                        {items.map((item, i) => (
                             <li key={i} className="relative pl-7 text-slate-700">
                                <span className="absolute left-2 top-2.5 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
                                {renderInline(item.replace(/^[-*]\s+/, ''))}
                             </li>
                        ))}
                    </ul>
                );
            }

             if (paragraph.trim().startsWith('#')) {
                const level = paragraph.match(/^#+/)?.[0].length || 1;
                const text = paragraph.replace(/^#+\s+/, '');
                
                if (level === 1) return <h1 key={`${index}-${pIndex}`} className="text-4xl font-extrabold mt-12 mb-6 text-slate-900 tracking-tight">{renderInline(text)}</h1>;
                if (level === 2) return <h2 key={`${index}-${pIndex}`} className="text-2xl font-bold mt-10 mb-5 text-slate-900 tracking-tight flex items-center"><span className="w-6 h-px bg-blue-600 mr-4"></span>{renderInline(text)}</h2>;
                if (level === 3) return <h3 key={`${index}-${pIndex}`} className="text-xl font-semibold mt-8 mb-4 text-slate-800 tracking-wide">{renderInline(text)}</h3>;
                return <h4 key={`${index}-${pIndex}`} className="text-lg font-medium mt-6 mb-3 text-slate-600">{renderInline(text)}</h4>;
             }

            return <p key={`${index}-${pIndex}`} className="mb-5 text-slate-600 leading-[1.8]">{renderInline(paragraph)}</p>;
        });
      })}
    </div>
  );
};