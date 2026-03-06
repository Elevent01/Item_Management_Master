// app/utils/rbacCache.js
/**
 * ============================================================
 * GLOBAL RBAC CACHE - Single fetch, shared across all components
 * ============================================================
 * Problems solved:
 *  - LeftPanel, FixBottom, rbacLinkFilter each made separate API calls
 *  - Now only ONE fetch happens; all components share the result
 *  - Server warm-up ping on startup (fixes Render free-tier cold start)
 * ============================================================
 */

const API_BASE = 'https://item-management-master-1.onrender.com/api';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// ============================================================
// GLOBAL STATE - Module level (shared across all imports)
// ============================================================
let _cachedPages = null;        // Flat list of all accessible pages
let _cacheTimestamp = null;     // When was it last fetched
let _fetchPromise = null;       // In-flight promise (deduplication)
let _serverWarmedUp = false;    // Has server been pinged

// ============================================================
// SERVER WARM-UP (Render free tier cold start fix)
// Retries every 3 seconds until server responds.
// Call at module load time so server wakes before Login fires.
// ============================================================
export const warmUpServer = () => {
  if (_serverWarmedUp) return;

  const serverBase = API_BASE.replace('/api', '');
  let attempts = 0;
  const maxAttempts = 10;

  const ping = () => {
    attempts++;
    console.log(`🔥 [RBAC CACHE] Server warm-up attempt ${attempts}...`);

    fetch(`${serverBase}/health`, { method: 'GET', cache: 'no-store' })
      .then(res => {
        if (res.ok) {
          _serverWarmedUp = true;
          console.log('✅ [RBAC CACHE] Server is warm!');
        } else if (attempts < maxAttempts) {
          setTimeout(ping, 3000);
        }
      })
      .catch(() => {
        // Server still sleeping — retry
        if (attempts < maxAttempts) {
          setTimeout(ping, 3000);
        }
      });
  };

  ping();
};

// ============================================================
// CORE: FETCH ACCESSIBLE PAGES (with deduplication)
// ============================================================
export const getAccessiblePages = async (forceRefresh = false) => {
  // 1. Return cache if fresh
  if (!forceRefresh && _cachedPages && _cacheTimestamp &&
      (Date.now() - _cacheTimestamp < CACHE_DURATION)) {
    console.log('⚡ [RBAC CACHE] Cache hit — pages:', _cachedPages.length);
    return _cachedPages;
  }

  // 2. If already fetching, wait for that promise (deduplication)
  //    This prevents LeftPanel + FixBottom from firing 2 simultaneous requests
  if (_fetchPromise) {
    console.log('⏳ [RBAC CACHE] Already fetching — waiting...');
    return _fetchPromise;
  }

  // 3. Start fresh fetch
  _fetchPromise = _doFetch();
  const result = await _fetchPromise;
  _fetchPromise = null;
  return result;
};

// ============================================================
// INTERNAL FETCH LOGIC
// ============================================================
const _doFetch = async () => {
  try {
    console.log('🌐 [RBAC CACHE] Fetching from backend...');

    // Step 1: Get user from sessionStorage
    const storedUser = sessionStorage.getItem('userData');
    if (!storedUser) {
      console.error('❌ [RBAC CACHE] No userData in session');
      return [];
    }

    const parsed = JSON.parse(storedUser);
    let user = parsed?.user;

    if (!user?.id) {
      console.error('❌ [RBAC CACHE] Invalid user data');
      return [];
    }

    // Step 2: Fetch user details if accesses missing (only 1 call if needed)
    if (!user.accesses || user.accesses.length === 0) {
      console.log('📡 [RBAC CACHE] Fetching user details...');
      const res = await fetch(`${API_BASE}/users/${user.id}`);
      if (res.ok) {
        user = await res.json();
        parsed.user = user;
        sessionStorage.setItem('userData', JSON.stringify(parsed));
      }
    }

    if (!user.accesses || user.accesses.length === 0) {
      console.error('❌ [RBAC CACHE] No company access');
      return [];
    }

    // Step 3: Get primary company
    const primaryAccess = user.accesses.find(a => a.is_primary_company) || user.accesses[0];
    const companyId = primaryAccess?.company?.id;

    if (!companyId) {
      console.error('❌ [RBAC CACHE] No company ID');
      return [];
    }

    // Step 4: Fetch accessible menu (THE main call)
    console.log(`📡 [RBAC CACHE] Fetching menu for user=${user.id}, company=${companyId}`);
    const menuRes = await fetch(
      `${API_BASE}/rbac/users/${user.id}/accessible-menu?company_id=${companyId}`
    );

    if (!menuRes.ok) {
      console.error('❌ [RBAC CACHE] Menu fetch failed:', menuRes.status);
      return [];
    }

    const menuJson = await menuRes.json();

    // Step 5: Flatten hierarchical menu into flat page list
    const allPages = [];
    const flatten = (pages) => {
      pages.forEach(page => {
        allPages.push(page);
        if (page.children?.length > 0) flatten(page.children);
      });
    };
    if (menuJson.menu?.length > 0) flatten(menuJson.menu);

    // Update cache
    _cachedPages = allPages;
    _cacheTimestamp = Date.now();

    console.log(`✅ [RBAC CACHE] Fetched & cached ${allPages.length} pages`);
    return allPages;

  } catch (err) {
    console.error('❌ [RBAC CACHE] Fetch error:', err);
    _fetchPromise = null;
    return [];
  }
};

// ============================================================
// FILTER HELPERS (used by LeftPanel, FixBottom, etc.)
// ============================================================

/**
 * Filter a flat link array against cached accessible pages
 */
export const filterLinks = async (linksArray, forceRefresh = false) => {
  if (!linksArray?.length) return [];

  const accessiblePages = await getAccessiblePages(forceRefresh);
  if (!accessiblePages.length) return [];

  return linksArray.filter(link =>
    accessiblePages.some(page =>
      page.page_url?.includes(link.path) ||
      page.page_name?.toLowerCase().includes(link.name?.toLowerCase())
    )
  );
};

/**
 * Filter icon pages (each has nested links array)
 */
export const filterIconPagesFromCache = async (iconPages, forceRefresh = false) => {
  if (!iconPages?.length) return [];

  const accessiblePages = await getAccessiblePages(forceRefresh);
  if (!accessiblePages.length) return [];

  const result = [];
  for (const iconPage of iconPages) {
    const filteredLinks = (iconPage.links || []).filter(link =>
      accessiblePages.some(page =>
        page.page_url?.includes(link.path) ||
        page.page_name?.toLowerCase().includes(link.name?.toLowerCase())
      )
    );
    if (filteredLinks.length > 0) {
      result.push({ ...iconPage, links: filteredLinks });
    }
  }

  return result;
};

/**
 * Get accessible paths as a Set (for FixBottom tab validation)
 */
export const getAccessiblePathsSet = async (forceRefresh = false) => {
  const pages = await getAccessiblePages(forceRefresh);
  const paths = new Set();
  pages.forEach(page => { if (page.page_url) paths.add(page.page_url); });
  return paths;
};

/**
 * Check if a specific path is accessible
 */
export const hasAccess = async (linkPath) => {
  const pages = await getAccessiblePages();
  return pages.some(page => page.page_url?.includes(linkPath));
};

// ============================================================
// CACHE MANAGEMENT
// ============================================================

/** Call this after role/permission changes */
export const clearRbacCache = () => {
  _cachedPages = null;
  _cacheTimestamp = null;
  _fetchPromise = null;
  console.log('🗑️ [RBAC CACHE] Cache cleared');
};

/** Force refresh and return new data */
export const refreshRbacCache = () => getAccessiblePages(true);

/** Debug info */
export const getCacheInfo = () => ({
  hasCachedData: !!_cachedPages,
  pageCount: _cachedPages?.length ?? 0,
  ageMs: _cacheTimestamp ? Date.now() - _cacheTimestamp : null,
  ageSeconds: _cacheTimestamp ? Math.round((Date.now() - _cacheTimestamp) / 1000) : null,
  expiresInSeconds: _cacheTimestamp
    ? Math.max(0, Math.round((CACHE_DURATION - (Date.now() - _cacheTimestamp)) / 1000))
    : 0,
  isFetching: !!_fetchPromise,
});

// Expose debug info on window
if (typeof window !== 'undefined') {
  window._rbacCache = {
    getInfo: getCacheInfo,
    clear: clearRbacCache,
    refresh: refreshRbacCache,
    getPages: getAccessiblePages,
  };
  console.log('🔧 [RBAC CACHE] Debug: window._rbacCache available');
<<<<<<< HEAD
}
=======
}
>>>>>>> 26a6a6d988853ea366023f361e171aded7fe6042
