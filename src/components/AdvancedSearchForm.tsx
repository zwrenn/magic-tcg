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
  // Optional — only present when those fields are rendered in the form
  sort?: string;
  owner?: string;
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
  defaultValue?: string;
  options: { value: string; label: string }[];
}

interface OwnerInFormConfig {
  defaultValue?: string;
  options: { value: string; label: string }[];
}

interface AdvancedSearchFormProps {
  defaultValues?: Partial<AdvancedSearchValues>;
  onSubmit: (values: AdvancedSearchValues) => void;
  submitLabel?: string;
  sortInForm?: SortInFormConfig;
  ownerInForm?: OwnerInFormConfig;
}

const COLORS = ['W', 'U', 'B', 'R', 'G'] as const;

export function AdvancedSearchForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Search',
  sortInForm,
  ownerInForm,
}: AdvancedSearchFormProps) {
  function handleAction(fd: FormData) {
    onSubmit({
      name: (fd.get('name') as string) ?? '',
      typeLine: (fd.get('typeLine') as string) ?? '',
      colors: fd.getAll('colors') as string[],
      colorMode: ((fd.get('colorMode') as string) ||
        'including') as AdvancedSearchValues['colorMode'],
      colorless: fd.get('colorless') === 'on',
      rarity: (fd.get('rarity') as string) ?? '',
      cmc: (fd.get('cmc') as string) ?? '',
      cmcOp: ((fd.get('cmcOp') as string) ||
        'eq') as AdvancedSearchValues['cmcOp'],
      ...(sortInForm && {
        sort: (fd.get('sort') as string) || sortInForm.defaultValue || 'name',
      }),
      ...(ownerInForm && {
        owner:
          (fd.get('owner') as string) || ownerInForm.defaultValue || 'anyone',
      }),
    });
  }

  return (
    <form action={handleAction} className="space-y-3">
      {/* Name is the primary field — full width, visually prominent */}
      <Field label="Card name">
        <input
          name="name"
          defaultValue={defaultValues?.name ?? ''}
          placeholder="e.g. Smothering Tithe"
          className="input text-base"
          autoFocus
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type line">
          <input
            name="typeLine"
            defaultValue={defaultValues?.typeLine ?? ''}
            placeholder="e.g. legendary creature"
            className="input"
          />
        </Field>
        <Field label="Rarity">
          <select
            name="rarity"
            defaultValue={defaultValues?.rarity ?? ''}
            className="input"
          >
            <option value="">Any</option>
            <option value="common">Common</option>
            <option value="uncommon">Uncommon</option>
            <option value="rare">Rare</option>
            <option value="mythic">Mythic</option>
          </select>
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
                  name="colors"
                  value={c}
                  defaultChecked={defaultValues?.colors?.includes(c) ?? false}
                  className="accent-[var(--purple)]"
                />
                <i className={`ms ms-${c.toLowerCase()} ms-cost`} aria-hidden />{' '}
                {c}
              </label>
            ))}
          </div>
          <select
            name="colorMode"
            defaultValue={defaultValues?.colorMode ?? 'including'}
            className="rounded-lg border border-border bg-surface px-2 py-1 text-sm"
          >
            <option value="including">including these</option>
            <option value="exact">exactly these</option>
            <option value="atmost">at most these</option>
          </select>
          <label className="flex cursor-pointer items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              name="colorless"
              defaultChecked={defaultValues?.colorless ?? false}
              className="accent-[var(--purple)]"
            />
            Colorless only
          </label>
        </div>
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Mana value">
          <div className="flex gap-1.5">
            <select
              name="cmcOp"
              defaultValue={defaultValues?.cmcOp ?? 'eq'}
              className="input !w-auto"
            >
              <option value="eq">=</option>
              <option value="lte">≤</option>
              <option value="gte">≥</option>
            </select>
            <input
              type="number"
              name="cmc"
              min="0"
              defaultValue={defaultValues?.cmc ?? ''}
              placeholder="any"
              className="input"
            />
          </div>
        </Field>
        {ownerInForm && (
          <Field label="Owned by">
            <select
              name="owner"
              defaultValue={ownerInForm.defaultValue ?? 'anyone'}
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
        {sortInForm && (
          <Field label="Sort">
            <select
              name="sort"
              defaultValue={sortInForm.defaultValue ?? 'name'}
              className="input"
            >
              {sortInForm.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      <button type="submit" className="gel gel-purple">
        {submitLabel}
      </button>
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
