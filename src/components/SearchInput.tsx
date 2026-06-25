'use client';

import { useState } from 'react';

interface SearchInputProps {
  defaultQuery?: string;
  onSubmit: (query: string) => void;
  submitLabel?: string;
  autoFocus?: boolean;
}

export function SearchInput({
  defaultQuery,
  onSubmit,
  submitLabel = 'Search',
  autoFocus = true,
}: SearchInputProps) {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="space-y-2">
      <form action={(fd: FormData) => onSubmit((fd.get('q') as string) ?? '')}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            name="q"
            defaultValue={defaultQuery ?? ''}
            placeholder="e.g. urza t:legendary id<=uw r:rare"
            className="input flex-1 font-mono text-sm"
            autoFocus={autoFocus}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className="gel gel-purple shrink-0">
            {submitLabel}
          </button>
        </div>
      </form>
      <button
        type="button"
        onClick={() => setShowGuide((v) => !v)}
        className="text-xs text-muted underline hover:text-foreground"
      >
        {showGuide ? 'Hide' : 'Syntax guide'}
      </button>
      {showGuide && <SyntaxGuide />}
    </div>
  );
}

function SyntaxGuide() {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs">
      <p className="mb-2 font-medium">Query syntax</p>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left text-muted">
            <th className="pr-4 pb-1 font-normal">Keyword</th>
            <th className="pr-4 pb-1 font-normal">Example</th>
            <th className="pb-1 font-normal">Meaning</th>
          </tr>
        </thead>
        <tbody className="[&_td]:py-0.5 [&_td]:pr-4 [&_td:last-child]:pr-0">
          <Row
            kw="(bare words)"
            ex="urza"
            meaning="Name contains &ldquo;urza&rdquo;"
          />
          <Row
            kw="t: type:"
            ex="t:legendary"
            meaning="Type line contains word"
          />
          <Row
            kw="id: c:"
            ex="id:wu"
            meaning="Color identity includes W and U"
          />
          <Row
            kw=""
            ex="id<=wu"
            meaning="Color identity is at most W/U (subset)"
          />
          <Row kw="" ex="id=wu" meaning="Color identity is exactly W and U" />
          <Row kw="" ex="id:c" meaning="Colorless only" />
          <Row
            kw="r: rarity:"
            ex="r:rare"
            meaning="Rarity (c / u / r / m also work)"
          />
          <Row
            kw="mv: cmc:"
            ex="mv<=3"
            meaning="Mana value ≤ 3  (also >= and :)"
          />
          <Row
            kw="owner:"
            ex="owner:anyone"
            meaning="Ownership filter (anyone / everyone / 2 / 3 / name)"
          />
          <Row
            kw="sort:"
            ex="sort:price"
            meaning="Sort order (name · cmc · price)"
          />
        </tbody>
      </table>
      <p className="mt-2 text-muted">
        Combine freely:{' '}
        <span className="font-mono">
          urza t:artifact mv&lt;=3 id=wu sort:price
        </span>
      </p>
    </div>
  );
}

function Row({ kw, ex, meaning }: { kw: string; ex: string; meaning: string }) {
  return (
    <tr>
      <td className="font-mono text-muted">{kw}</td>
      <td className="font-mono">{ex}</td>
      <td dangerouslySetInnerHTML={{ __html: meaning }} />
    </tr>
  );
}
