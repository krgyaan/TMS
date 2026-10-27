type RegisterItem<Key, Item> = (key: Key, item: Item) => () => void;
/**
 * Collects item registrations into one immutable snapshot per React commit.
 * Also returns the live registry for reads that must include the registrations of the current
 * commit before its snapshot is published.
 */
export declare function useItemRegistry<Key, Item>(): ItemRegistry<Key, Item>;
export interface ItemRegistry<Key, Item> {
  /** The snapshot published after the latest commit's registrations. */
  items: ReadonlyMap<Key, Item>;
  registerItem: RegisterItem<Key, Item>;
  /** The registry itself, including registrations whose snapshot hasn't been published yet. */
  liveItems: ReadonlyMap<Key, Item>;
}
export {};