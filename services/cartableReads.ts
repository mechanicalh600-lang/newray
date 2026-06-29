import { supabase } from '../supabaseClient';

export const markCartableItemRead = async (cartableItemId: string, userId: string): Promise<void> => {
  if (!cartableItemId || !userId) return;
  try {
    const { error } = await supabase.from('cartable_item_reads').upsert(
      [{ cartable_item_id: cartableItemId, user_id: userId, read_at: new Date().toISOString() }],
      { onConflict: 'cartable_item_id,user_id', ignoreDuplicates: false }
    );
    if (error) throw error;
  } catch (err) {
    // fallback: JSON seen_by در cartable_items
    try {
      const { data, error: selErr } = await supabase
        .from('cartable_items')
        .select('data')
        .eq('id', cartableItemId)
        .single();
      if (selErr || !data) return;
      const currentData = (data.data as Record<string, unknown>) || {};
      const seenBy = Array.isArray(currentData.seen_by) ? (currentData.seen_by as string[]) : [];
      if (seenBy.includes(userId)) return;
      await supabase
        .from('cartable_items')
        .update({ data: { ...currentData, seen_by: [...seenBy, userId] } })
        .eq('id', cartableItemId);
    } catch {
      console.warn('markCartableItemRead failed', err);
    }
  }
};

export const fetchReadCartableIds = async (userId: string, itemIds: string[]): Promise<Set<string>> => {
  const read = new Set<string>();
  if (!userId || !itemIds.length) return read;
  try {
    const { data, error } = await supabase
      .from('cartable_item_reads')
      .select('cartable_item_id')
      .eq('user_id', userId)
      .in('cartable_item_id', itemIds);
    if (error) throw error;
    (data || []).forEach(row => read.add(String(row.cartable_item_id)));
    return read;
  } catch {
    return read;
  }
};

export const clearCartableItemReads = async (cartableItemId: string): Promise<void> => {
  if (!cartableItemId) return;
  try {
    await supabase.from('cartable_item_reads').delete().eq('cartable_item_id', cartableItemId);
  } catch {
    // non-blocking
  }
};

export const isItemUnread = (
  itemId: string,
  userId: string,
  readIds: Set<string>,
  legacySeenBy?: string[]
): boolean => {
  if (readIds.has(itemId)) return false;
  if (legacySeenBy?.includes(userId)) return false;
  return true;
};
