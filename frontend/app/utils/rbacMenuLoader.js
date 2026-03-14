// app/utils/rbacMenuLoader.js
/**
 * 🔥 RBAC Menu Loader - Smart Filtering System
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
    console.log('🔍 [MENU LOADER] Starting link filtering...');
    console.log('📦 [MENU LOADER] Input links:', linksArray.length);

    // ✅ rbacCache se lo — yeh already deduplicated hai
    const accessiblePages = await getAccessiblePages();

    if (!accessiblePages || accessiblePages.length === 0) {
      console.warn('⚠️ [MENU LOADER] No accessible pages found');
      return [];
    }

    console.log('✅ [MENU LOADER] Accessible pages:', accessiblePages.length);

    const filteredLinks = linksArray.filter(link => {
      const isAccessible = accessiblePages.some(page => {
        if (page.page_url?.includes(link.path)) return true;
        if (page.page_name?.toLowerCase().includes(link.name?.toLowerCase())) return true;
        return false;
      });

      if (isAccessible) {
        console.log('✅ [MENU LOADER] Access granted:', link.name);
      } else {
        console.log('❌ [MENU LOADER] Access denied:', link.name);
      }

      return isAccessible;
    });

    console.log('🎯 [MENU LOADER] Filtered links:', filteredLinks.length);
    return filteredLinks;

  } catch (error) {
    console.error('❌ [MENU LOADER] Error:', error);
    return [];
  }
}

/**
 * Filter icon pages (maintains structure with nested links)
 * ✅ Uses shared rbacCache — NO duplicate API call
 */
export async function filterIconPages(iconPagesArr) {
  try {
    console.log('🔍 [MENU LOADER] Filtering icon pages...');

    const result = await filterIconPagesFromCache(iconPagesArr);

    console.log('✅ [MENU LOADER] Filtered icon pages:', result.length);
    return result;

  } catch (error) {
    console.error('❌ [MENU LOADER] Error filtering icon pages:', error);
    return [];
  }
}

/**
 * Check if specific link is accessible
 */
export async function hasAccessToLink(linkPath) {
  try {
    const accessiblePages = await getAccessiblePages();
    return accessiblePages.some(page => page.page_url?.includes(linkPath));
  } catch (error) {
    console.error('❌ [MENU LOADER] Error checking access:', error);
    return false;
  }
}

/**
 * Get filtered links with in-memory caching
 */
const linkCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getFilteredLinksWithCache(linksArray, cacheKey) {
  const cached = linkCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('✅ [MENU LOADER] Using cached links');
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
  console.log('🗑️ [MENU LOADER] Cache cleared');
}
