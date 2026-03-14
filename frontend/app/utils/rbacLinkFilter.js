// app/utils/rbacLinkFilter.js
/**
 * 🔥 RBAC Link Filter - Smart Filtering System
 * Filters config links based on backend RBAC permissions
 *
 * ✅ FIX: Ab yeh apni alag API call NAHI karta
 * rbacCache.js se shared data leta hai — sirf 1 API call hoti hai
 */

// ✅ Import from rbacCache — shared cache use karo, duplicate call nahi
import { getAccessiblePages, filterIconPagesFromCache } from './rbacCache';

/**
 * Main function: Filter any link array based on user's accessible pages
 * ✅ Uses shared rbacCache — NO duplicate API call
 */
export async function filterLinksByAccess(linksArray) {
  try {
    console.log('🔍 [FILTER] Starting link filtering...');
    console.log('📦 [FILTER] Input links:', linksArray.length);

    // ✅ rbacCache se lo — yeh already deduplicated hai
    const accessiblePages = await getAccessiblePages();

    if (!accessiblePages || accessiblePages.length === 0) {
      console.warn('⚠️ [FILTER] No accessible pages found');
      return [];
    }

    console.log('✅ [FILTER] Accessible pages:', accessiblePages.length);

    const filteredLinks = linksArray.filter(link => {
      const isAccessible = accessiblePages.some(page => {
        if (page.page_url?.includes(link.path)) return true;
        if (page.page_name?.toLowerCase().includes(link.name?.toLowerCase())) return true;
        return false;
      });

      if (isAccessible) {
        console.log('✅ [FILTER] Access granted:', link.name);
      } else {
        console.log('❌ [FILTER] Access denied:', link.name);
      }

      return isAccessible;
    });

    console.log('🎯 [FILTER] Filtered links:', filteredLinks.length);
    return filteredLinks;

  } catch (error) {
    console.error('❌ [FILTER] Error:', error);
    return [];
  }
}

/**
 * Filter icon pages (maintains structure with nested links)
 * ✅ Uses shared rbacCache — NO duplicate API call
 */
export async function filterIconPages(iconPagesArr) {
  try {
    console.log('🔍 [FILTER] Filtering icon pages...');

    // ✅ rbacCache ka function use karo
    const result = await filterIconPagesFromCache(iconPagesArr);

    console.log('✅ [FILTER] Filtered icon pages:', result.length);
    return result;

  } catch (error) {
    console.error('❌ [FILTER] Error filtering icon pages:', error);
    return [];
  }
}

/**
 * Check if specific link is accessible
 * ✅ Uses shared rbacCache
 */
export async function hasAccessToLink(linkPath) {
  try {
    const accessiblePages = await getAccessiblePages();
    return accessiblePages.some(page => page.page_url?.includes(linkPath));
  } catch (error) {
    console.error('❌ [FILTER] Error checking access:', error);
    return false;
  }
}

/**
 * Get filtered links with in-memory caching
 * ✅ Uses shared rbacCache — no duplicate API call
 */
const linkCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getFilteredLinksWithCache(linksArray, cacheKey) {
  const cached = linkCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('✅ [FILTER] Using cached links');
    return cached.links;
  }

  const filtered = await filterLinksByAccess(linksArray);

  linkCache.set(cacheKey, {
    links: filtered,
    timestamp: Date.now()
  });

  return filtered;
}

/**
 * Clear cache (call after role/access changes)
 */
export function clearLinkCache() {
  linkCache.clear();
  console.log('🗑️ [FILTER] Cache cleared');
}

/**
 * Backward-compatible alias used by menuRefreshHelper.js
 */
export const refreshAccessCache = async () => {
  clearLinkCache();
  const { refreshRbacCache } = await import('./rbacCache');
  return refreshRbacCache();
};
