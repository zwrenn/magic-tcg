import { Chip } from '@/components/Chip';
import type { AdvancedSearchValues } from '@/lib/search/queryParser';

const CMC_OP: Record<string, string> = { eq: '=', lte: '≤', gte: '≥' };

interface QueryChipsProps {
  values: AdvancedSearchValues;
  onChange: (v: AdvancedSearchValues) => void;
}

export function QueryChips({ values, onChange }: QueryChipsProps) {
  const { name, typeLine, colors, colorless, rarity, cmc, cmcOp } = values;

  function clear<K extends keyof AdvancedSearchValues>(
    key: K,
    empty: AdvancedSearchValues[K]
  ) {
    onChange({ ...values, [key]: empty });
  }

  return (
    <>
      {name && <Chip label={`"${name}"`} onClear={() => clear('name', '')} />}
      {typeLine && (
        <Chip
          label={`type: ${typeLine}`}
          onClear={() => clear('typeLine', '')}
        />
      )}
      {colors.length > 0 && (
        <Chip label={colors.join(', ')} onClear={() => clear('colors', [])} />
      )}
      {colorless && (
        <Chip label="Colorless" onClear={() => clear('colorless', false)} />
      )}
      {rarity && (
        <Chip
          label={rarity[0].toUpperCase() + rarity.slice(1)}
          onClear={() => clear('rarity', '')}
        />
      )}
      {cmc && (
        <Chip
          label={`MV ${CMC_OP[cmcOp] ?? '='} ${cmc}`}
          onClear={() => clear('cmc', '')}
        />
      )}
    </>
  );
}
