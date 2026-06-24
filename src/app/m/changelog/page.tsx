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

    if (line.startsWith('# ') && !line.startsWith('## ')) continue;

    if (line.trim() === '---') {
      elements.push(<hr key={key++} className='border-zinc-800 my-6' />);
      continue;
    }

    if (line.startsWith('## ')) {
      const text = line.replace(/^## /, '').replace(/\[|\]/g, '');
      elements.push(
        <h2 key={key++} className='text-xl font-bold text-white mt-6 mb-2'>
          {text}
        </h2>
      );
      continue;
    }

    if (line.startsWith('### ')) {
      const text = line.replace(/^### /, '');
      elements.push(
        <h3
          key={key++}
          className='text-base font-semibold text-emerald-400 mt-4 mb-2'
        >
          {text}
        </h3>
      );
      continue;
    }

    if (line.startsWith('#### ')) {
      const text = line.replace(/^#### /, '');
      elements.push(
        <h4
          key={key++}
          className='text-sm font-medium text-zinc-200 mt-3 mb-1'
        >
          {text}
        </h4>
      );
      continue;
    }

    if (line.startsWith('- ')) {
      const text = line.replace(/^- /, '');
      const parts = text.split(/\*\*(.+?)\*\*/g);
      elements.push(
        <li
          key={key++}
          className='text-zinc-300 text-sm ml-4 mb-1.5 list-disc list-outside'
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

    if (line.trim() && !line.startsWith('**Note**')) {
      elements.push(
        <p key={key++} className='text-zinc-400 text-sm mb-2'>
          {line}
        </p>
      );
      continue;
    }
  }

  return elements;
}

export default function MobileChangelogPage() {
  const filePath = path.join(process.cwd(), 'changelog/user.md');
  const markdown = fs.readFileSync(filePath, 'utf-8');
  const content = parseChangelog(markdown);

  return (
    <div className='px-4 py-6 space-y-4'>
      <div>
        <div className='flex items-center gap-2 mb-1'>
          <FileText className='w-5 h-5 text-emerald-400' />
          <h1 className='text-2xl font-bold text-white'>Changelog</h1>
        </div>
        <p className='text-zinc-400 text-sm'>
          What&apos;s new and improved in Rec
        </p>
      </div>

      <div className='bg-zinc-900 border border-zinc-800 rounded-xl p-5'>
        <ul className='list-none'>{content}</ul>
      </div>
    </div>
  );
}
