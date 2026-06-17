import { requireUser } from '@/lib/auth';
import {
  searchUserCollection,
  VALID_COLORS,
  VALID_SORT_KEYS,
  VALID_TYPES,
} from '@/lib/search';
import type { CollectionQueryOptions } from '@/lib/search';

const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 200;

export async function GET(req: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);

  const color = searchParams.get('color') ?? 'all';
  const type = searchParams.get('type') ?? 'all';
  const sortBy = searchParams.get('sortBy') ?? 'name';
  const sortDir = searchParams.get('sortDir') ?? 'asc';
  const deckFilter = searchParams.get('deckFilter') ?? 'any';

  if (
    !VALID_COLORS.includes(color as never) ||
    !VALID_TYPES.includes(type as never) ||
    !VALID_SORT_KEYS.includes(sortBy as never) ||
    !['asc', 'desc'].includes(sortDir) ||
    !['any', 'in', 'out'].includes(deckFilter)
  ) {
    return Response.json(
      { error: 'Invalid filter parameters' },
      { status: 400 }
    );
  }

  const rawLimit = parseInt(
    searchParams.get('limit') ?? String(DEFAULT_LIMIT),
    10
  );
  const limit = Number.isFinite(rawLimit)
    ? Math.min(MAX_LIMIT, Math.max(1, rawLimit))
    : DEFAULT_LIMIT;

  const rawPage = parseInt(searchParams.get('page') ?? '1', 10);
  const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;

  const options: CollectionQueryOptions = {
    q: searchParams.get('q') ?? '',
    color: color as CollectionQueryOptions['color'],
    type: type as CollectionQueryOptions['type'],
    set: searchParams.get('set') ?? 'all',
    sortBy: sortBy as CollectionQueryOptions['sortBy'],
    sortDir: sortDir as 'asc' | 'desc',
    page,
    limit,
    favOnly: searchParams.get('favOnly') === 'true',
    deckFilter: deckFilter as 'any' | 'in' | 'out',
  };

  try {
    const result = await searchUserCollection(user.id, options);
    return Response.json(result);
  } catch (e) {
    console.error('Collection query failed:', e);
    return Response.json(
      { error: 'Failed to fetch collection' },
      { status: 500 }
    );
  }
}
