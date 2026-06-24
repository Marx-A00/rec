import fs from 'fs';
import path from 'path';

import { FileText } from 'lucide-react';

const EMOJI_RE = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]\s*/gu;

function parseChangelog(markdown: string) {
  const lines = markdown.replace(EMOJI_RE, '').split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip the top-level title and the note at the bottom
    if (line.startsWith('# ') && !line.startsWith('## ')) continue;

    // Horizontal rule
    if (line.trim() === '---') {
      elements.push(<hr key={key++} className='border-zinc-800 my-8' />);
      continue;
    }

    // Version header (## [v1.1.0] - ...)
    if (line.startsWith('## ')) {
      const text = line.replace(/^## /, '').replace(/\[|\]/g, '');
      elements.push(
        <h2 key={key++} className='text-2xl font-bold text-white mt-8 mb-2'>
          {text}
        </h2>
      );
      continue;
    }

    // Section header (### ...)
    if (line.startsWith('### ')) {
      const text = line.replace(/^### /, '');
      elements.push(
        <h3
          key={key++}
          className='text-lg font-semibold text-cosmic-latte mt-6 mb-3'
        >
          {text}
        </h3>
      );
      continue;
    }

    // Subsection header (#### ...)
    if (line.startsWith('#### ')) {
      const text = line.replace(/^#### /, '');
      elements.push(
        <h4
          key={key++}
          className='text-base font-medium text-zinc-200 mt-4 mb-2'
        >
          {text}
        </h4>
      );
      continue;
    }

    // Bullet point
    if (line.startsWith('- ')) {
      const text = line.replace(/^- /, '');
      const parts = text.split(/\*\*(.+?)\*\*/g);
      elements.push(
        <li
          key={key++}
          className='text-zinc-300 ml-4 mb-1.5 list-disc list-outside'
        >
          {parts.map((part, idx) =>
            idx % 2 === 1 ? (
              <strong key={idx} className='text-white'>
                {part}
              </strong>
            ) : (
              <span key={idx}>{part}</span>
            )
          )}
        </li>
      );
      continue;
    }

    // Paragraph text (non-empty, non-special lines)
    if (line.trim() && !line.startsWith('**Note**')) {
      elements.push(
        <p key={key++} className='text-zinc-400 mb-2'>
          {line}
        </p>
      );
      continue;
    }
  }

  return elements;
}

export default function ChangelogPage() {
  const filePath = path.join(process.cwd(), 'changelog/user.md');
  const markdown = fs.readFileSync(filePath, 'utf-8');
  const content = parseChangelog(markdown);

  return (
    <div className='max-w-4xl mx-auto space-y-2'>
      <div className='mb-6'>
        <div className='flex items-center gap-3 mb-2'>
          <FileText className='w-7 h-7 text-cosmic-latte' />
          <h1 className='text-3xl font-bold text-white'>Changelog</h1>
        </div>
        <p className='text-zinc-400'>What&apos;s new and improved in Rec</p>
      </div>

      <div className='bg-zinc-900 border border-zinc-700 rounded-lg p-6'>
        <ul className='list-none'>{content}</ul>
      </div>
    </div>
  );
}
