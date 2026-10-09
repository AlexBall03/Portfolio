import 'server-only';

/**
 * Repository write conventions for admin-managed content. Repositories supply
 * the table-specific statements; these helpers fix the rules.
 */

/**
 * Makes an ordered list in the database match `items`: known ids are updated,
 * anything else is inserted (an unknown id is treated as new, never trusted),
 * rows not in the list are deleted, and list position becomes `sort_order`.
 * Returns the saved ids in order.
 */
export async function reconcileList<Item extends { id?: string | undefined }>(
  existingIds: readonly string[],
  items: readonly Item[],
  ops: {
    update: (id: string, item: Item, sortOrder: number) => Promise<unknown>;
    insert: (item: Item, sortOrder: number) => Promise<string>;
    remove: (ids: string[]) => Promise<unknown>;
  },
): Promise<string[]> {
  const known = new Set(existingIds);
  const saved: string[] = [];
  for (const [sortOrder, item] of items.entries()) {
    if (item.id && known.has(item.id) && !saved.includes(item.id)) {
      await ops.update(item.id, item, sortOrder);
      saved.push(item.id);
    } else {
      saved.push(await ops.insert(item, sortOrder));
    }
  }
  const stale = existingIds.filter((id) => !saved.includes(id));
  if (stale.length) await ops.remove(stale);
  return saved;
}
