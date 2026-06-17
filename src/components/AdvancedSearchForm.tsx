'use client';

export interface AdvancedSearchValues {
  name: string;
  typeLine: string;
  colors: string[];
  colorMode: 'including' | 'exact' | 'atmost';
  colorless: boolean;
  rarity: string;
  cmc: string;
  cmcOp: 'eq' | 'lte' | 'gte';
}

export const EMPTY_SEARCH_VALUES: AdvancedSearchValues = {
  name: '',
  typeLine: '',
  colors: [],
  colorMode: 'including',
  colorless: false,
  rarity: '',
  cmc: '',
  cmcOp: 'eq',
};

interface SortInFormConfig {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}

interface OwnerInFormConfig {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}

interface AdvancedSearchFormProps {
  values: AdvancedSearchValues;
  onChange: (values: AdvancedSearchValues) => void;
  onSubmit: (values: AdvancedSearchValues) => void;
  submitLabel?: string;
  sortInForm?: SortInFormConfig;
  ownerInForm?: OwnerInFormConfig;
}

const COLORS = ['W', 'U', 'B', 'R', 'G'] as const;

export function AdvancedSearchForm({
  values,
  onChange,
  onSubmit,
  submitLabel = 'Search',
  sortInForm,
  ownerInForm,
}: AdvancedSearchFormProps) {
  function set<K extends keyof AdvancedSearchValues>(
    key: K,
    value: AdvancedSearchValues[K]
  ) {
    onChange({ ...values, [key]: value });
  }

  function toggleColor(c: string) {
    const next = values.colors.includes(c)
      ? values.colors.filter((x) => x !== c)
      : [...values.colors, c];
    set('colors', next);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Card name">
          <input
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="part of a name"
            className="input"
          />
        </Field>
        <Field label="Type line">
          <input
            value={values.typeLine}
            onChange={(e) => set('typeLine', e.target.value)}
            placeholder="e.g. legendary creature"
            className="input"
          />
        </Field>
      </div>

      <Field label="Color identity">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <label
                key={c}
                className="flex cursor-pointer items-center gap-1 text-sm"
              >
                <input
                  type="checkbox"
                  checked={values.colors.includes(c)}
                  onChange={() => toggleColor(c)}
                  className="accent-[var(--purple)]"
                />
                <i className={`ms ms-${c.toLowerCase()} ms-cost`} aria-hidden />{' '}
                {c}
              </label>
            ))}
          </div>
          <select
            value={values.colorMode}
            onChange={(e) =>
              set(
                'colorMode',
                e.target.value as AdvancedSearchValues['colorMode']
              )
            }
            className="rounded-lg border border-border bg-surface px-2 py-1 text-sm"
          >
            <option value="including">including these</option>
            <option value="exact">exactly these</option>
            <option value="atmost">at most these</option>
          </select>
          <label className="flex cursor-pointer items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={values.colorless}
              onChange={(e) => set('colorless', e.target.checked)}
              className="accent-[var(--purple)]"
            />
            Colorless only
          </label>
        </div>
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Rarity">
          <select
            value={values.rarity}
            onChange={(e) => set('rarity', e.target.value)}
            className="input"
          >
            <option value="">Any</option>
            <option value="common">Common</option>
            <option value="uncommon">Uncommon</option>
            <option value="rare">Rare</option>
            <option value="mythic">Mythic</option>
          </select>
        </Field>
        <Field label="Mana value">
          <div className="flex gap-1.5">
            <select
              value={values.cmcOp}
              onChange={(e) =>
                set('cmcOp', e.target.value as AdvancedSearchValues['cmcOp'])
              }
              className="input !w-auto"
            >
              <option value="eq">=</option>
              <option value="lte">≤</option>
              <option value="gte">≥</option>
            </select>
            <input
              type="number"
              min="0"
              value={values.cmc}
              onChange={(e) => set('cmc', e.target.value)}
              placeholder="any"
              className="input"
            />
          </div>
        </Field>
        {ownerInForm && (
          <Field label="Owned by">
            <select
              value={ownerInForm.value}
              onChange={(e) => ownerInForm.onChange(e.target.value)}
              className="input"
            >
              {ownerInForm.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      <div className="flex items-center gap-3">
        {sortInForm && (
          <Field label="Sort">
            <select
              value={sortInForm.value}
              onChange={(e) => sortInForm.onChange(e.target.value)}
              className="input !w-auto"
            >
              {sortInForm.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        )}
        <button type="submit" className="gel gel-purple mt-5">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="t-label mb-1 block">{label}</span>
      {children}
    </label>
  );
}
