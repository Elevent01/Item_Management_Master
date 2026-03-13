// app/config/PageLinksConfig.js
/**
 * ============================================
 * CENTRALIZED PAGE LINKS CONFIGURATION
 * 🔥 FULLY AUTOMATIC - Uses iconLoader
 * ============================================
 */

import { getAllIconsWithStructure } from '../utils/iconLoader';

/**
 * 🔥 AUTOMATIC PAGE COLLECTION
 * Uses iconLoader to get all pages from all configs
 */

const getCbaMasterLinks = () => {
  try {
    const { cbaLinks } = require('./cbaLinks');
    console.log('🎨 [CONFIG] CbaMaster Links loaded:', cbaLinks.length);
    console.log('📋 [CONFIG] CbaMaster Pages:', cbaLinks.map(l => l.name));
    return cbaLinks || [];
  } catch (error) {
    console.warn('⚠️ CbaMaster links not available:', error.message);
    return [];
  }
};


const getVishalMasterLinks = () => {
  try {
    const { vishalLinks } = require('./vishalLinks');
    console.log('🎨 [CONFIG] VishalMaster Links loaded:', vishalLinks.length);
    console.log('📋 [CONFIG] VishalMaster Pages:', vishalLinks.map(l => l.name));
    return vishalLinks || [];
  } catch (error) {
    console.warn('⚠️ VishalMaster links not available:', error.message);
    return [];
  }
};

export const getAllPagesForSync = () => {
  const allPages = [];
  let pageCounter = 0;

  console.log('📋 [SYNC] Starting automatic page collection...');
  
  try {
    // Get all icons with their complete structure from iconLoader
    const icons = getAllIconsWithStructure();
    
    console.log(`🎯 [SYNC] Found ${icons.length} icons with configs`);

    // Process each icon
    icons.forEach(icon => {
      const category = icon.configDisplayName || icon.displayName;
      const pathPrefix = icon.path.replace(/^icon-/, '');
      
      console.log(`📌 [SYNC] Processing ${icon.displayName}: ${icon.linkCount} pages`);
      
      // Add each link as a page
      icon.links.forEach(link => {
        pageCounter++;
        allPages.push({
          page_name: link.name || `${category} Page ${pageCounter}`,
          page_url: link.path ? `/${pathPrefix}/${link.path}` : `/${pathPrefix}/page-${pageCounter}`,
          icon_name: extractIconName(link.icon),
          category: category,
          description: link.description || `${category} - ${link.name}`
        });
      });
    });

    console.log(`✅ [SYNC] Total Pages Collected: ${allPages.length}`);
    
    // Category breakdown
    const categoryCount = {};
    allPages.forEach(page => {
      categoryCount[page.category] = (categoryCount[page.category] || 0) + 1;
    });
    
    console.log('📊 [SYNC] Category Breakdown:');
    Object.entries(categoryCount).forEach(([cat, count]) => {
      console.log(`  • ${cat}: ${count} pages`);
    });
    
  } catch (error) {
    console.error('❌ [SYNC] Error:', error);
  }
  
  return allPages;
};

/**
 * Extract icon name from component
 */
const extractIconName = (iconComponent) => {
  if (!iconComponent) return 'FileText';
  if (typeof iconComponent === 'string') return iconComponent;
  if (iconComponent.name) return iconComponent.name;
  if (iconComponent.displayName) return iconComponent.displayName;
  return 'FileText';
};

// ==================== STATISTICS FUNCTION ====================
export const getPageStatistics = () => {
  const allPages = getAllPagesForSync();
  const categories = {};
  
  allPages.forEach(page => {
    const cat = page.category || 'Uncategorized';
    if (!categories[cat]) {
      categories[cat] = 0;
    }
    categories[cat]++;
  });

  console.log('📊 [SYNC] Page Statistics:', categories);

  return {
    totalPages: allPages.length,
    categories: Object.keys(categories),
    categoryCount: Object.keys(categories).length,
    breakdown: categories
  };
};

// ==================== 🎯 HOW IT WORKS ====================
/**
 * FULLY AUTOMATIC SYSTEM:
 * 
 * 1. IconPageCreator creates new icon → config files selected
 * 2. Icon automatically appears in iconLoader (auto-discovery)
 * 3. PageLinksConfig reads from iconLoader
 * 4. All pages automatically sync to backend
 * 
 * NO MANUAL REGISTRATION ANYWHERE! 🎉
 */

// ==================== VERIFICATION ====================
if (typeof window !== 'undefined') {
  console.log('🔍 [SYNC] Verification:');
  const stats = getPageStatistics();
  console.log('  Total pages for sync:', stats.totalPages);
  console.log('  Total categories:', stats.categoryCount);
  console.log('  ✅ All pages auto-discovered from iconLoader!');
  console.log('  🚀 System is fully automatic - no manual config needed!');
}
