import { supabase } from '../supabaseClient';

/**
 * بارگذاری ستون‌های قابل نمایش از دیتابیس
 */
export async function fetchUserColumnPreferences(
  userId: string,
  pageKey: string
): Promise<string[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('user_column_preferences')
    .select('visible_column_keys')
    .eq('user_id', userId)
    .eq('page_key', pageKey)
    .maybeSingle();
  if (error) return [];
  const keys = data?.visible_column_keys;
  return Array.isArray(keys) ? keys : [];
}

/**
 * ذخیره ستون‌های قابل نمایش در دیتابیس
 */
export async function saveUserColumnPreferences(
  userId: string,
  pageKey: string,
  visibleKeys: string[]
): Promise<void> {
  if (!userId) return;
  await supabase
    .from('user_column_preferences')
    .upsert(
      {
        user_id: userId,
        page_key: pageKey,
        visible_column_keys: visibleKeys,
      },
      { onConflict: ['user_id', 'page_key'] }
    );
}
