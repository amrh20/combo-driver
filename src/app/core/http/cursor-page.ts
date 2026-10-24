import { Observable, map, of, switchMap } from 'rxjs';

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

const MAX_PAGES = 20;

/** Follows `nextCursor` until the last page. Stops after {@link MAX_PAGES} so a repeated cursor cannot loop. */
export function collectCursorPages<T>(
  fetchPage: (cursor?: string) => Observable<CursorPage<T>>,
): Observable<T[]> {
  const read = (cursor: string | undefined, depth: number): Observable<T[]> => {
    if (depth >= MAX_PAGES) {
      return of([]);
    }

    return fetchPage(cursor).pipe(
      switchMap((page) => {
        const items = page.items ?? [];

        if (!page.nextCursor) {
          return of(items);
        }

        return read(page.nextCursor, depth + 1).pipe(map((rest) => items.concat(rest)));
      }),
    );
  };

  return read(undefined, 0);
}
