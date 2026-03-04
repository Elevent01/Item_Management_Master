// app/utils/iconLoader.js
/**
 * ============================================
 * 🔥 FULLY AUTOMATIC ICON LOADER - ENHANCED
 * Automatically discovers ALL config files
 * Shows Icon → Config Files → Sub Items
 * NO MANUAL REGISTRATION NEEDED!
 * ============================================
 */

/**
 * 🔥 AUTOMATIC CONFIG DISCOVERY
 * Tries to load every possible config file
 */
const discoverAllConfigs = () => {
  const icons = [];
  
  // 📋 COMPLETE LIST - All possible config files
  const possibleConfigs = [
    // Core existing configs
    'adminMasterLinks',
    'analysisLinks', 
    'financeLinks',
    'itemMasterLinks',
    'userManagementLinks',
    'reportsLinks',
    'ocrLinks',
    'uomLinks',
    
    // Your new configs
    'abcLinks',
    'bdLinks',
    'cdLinks',
    'cbaLinks',
    'vishalLinks',
    
    // Additional possible configs
    'salesLinks',
    'inventoryLinks',
    'purchaseLinks',
    'productionLinks',
    'hrLinks',
    'crmLinks',
    'accountsLinks',
    'marketingLinks',
    'logisticsLinks',
    'qualityLinks',
    'maintenanceLinks',
    'securityLinks',
    'complianceLinks',
    'rndLinks',
    'projectsLinks',
    'assetsLinks',
    'vendorLinks',
    'customerLinks',
    'contractLinks',
    'budgetLinks',
    'auditLinks',
    'trainingLinks',
    'documentLinks',
    'workflowLinks',
    'dashboardLinks',
    'analyticsLinks',
    'settingsLinks',
  ];
  
  console.log('🔍 [ICON LOADER] Starting automatic discovery...');
  console.log(`📋 [ICON LOADER] Checking ${possibleConfigs.length} possible configs`);
  
  let successCount = 0;
  let failCount = 0;
  
  possibleConfigs.forEach((configName, index) => {
    try {
      // Try to load the config module
      const configModule = require(`../config/${configName}`);
      const links = configModule[configName];
      
      // Only process if links exist and is an array with items
      if (links && Array.isArray(links) && links.length > 0) {
        successCount++;
        
        // Convert configName to proper format
        // e.g., 'abcLinks' → 'Abc'
        const baseName = configName.replace(/Links$/, '');
        
        // Create Master name: 'abc' → 'AbcMaster'
        const masterName = baseName.charAt(0).toUpperCase() + baseName.slice(1) + 'Master';
        
        // Create path: 'abc' → 'icon-abc'
        const pathName = baseName
          .replace(/([A-Z])/g, '-$1')
          .toLowerCase()
          .replace(/^-/, '');
        
        // Create display name: 'abc' → 'Abc'
        const displayName = baseName
          .replace(/([A-Z])/g, ' $1')
          .trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        // Try to load the Master component
        let component = null;
        try {
          const componentModule = require(`../icons/${masterName}`);
          component = componentModule.default;
          console.log(`  ✅ [${index + 1}/${possibleConfigs.length}] ${masterName}: ${links.length} links, component found`);
        } catch (e) {
          console.log(`  ⚠️  [${index + 1}/${possibleConfigs.length}] ${masterName}: ${links.length} links, component missing (will auto-generate)`);
        }
        
        icons.push({
          name: masterName,
          path: `icon-${pathName}`,
          displayName: displayName,
          links: links,
          component: component,
          configName: configName
        });
        
      } else if (links && Array.isArray(links) && links.length === 0) {
        console.log(`  ℹ️  [${index + 1}/${possibleConfigs.length}] ${configName}: Empty config (0 links)`);
      }
    } catch (error) {
      // Config file doesn't exist - this is normal, skip silently
      failCount++;
    }
  });
  
  console.log(`\n📊 [ICON LOADER] Discovery Summary:`);
  console.log(`  ✅ Found: ${successCount} configs`);
  console.log(`  ⭐️  Skipped: ${failCount} configs (files don't exist)`);
  console.log(`  📦 Total icons registered: ${icons.length}\n`);
  
  return icons;
};

// ============================================
// 🔥 ICON PAGES - Auto Discovery
// ============================================
export let iconPages = discoverAllConfigs();

// Detailed verification
console.log('╔═══════════════════════════════════════════════════╗');
console.log('📦 ICON LOADER - REGISTERED ICONS');
console.log('╠═══════════════════════════════════════════════════╣');
iconPages.forEach((icon, index) => {
  console.log(`${index + 1}. ${icon.displayName}`);
  console.log(`   Path: ${icon.path}`);
  console.log(`   Config: ${icon.configName}`);
  console.log(`   Links: ${icon.links.length}`);
  console.log(`   Component: ${icon.component ? '✅ Loaded' : '⚠️ Missing'}`);
  console.log('');
});
console.log('╚═══════════════════════════════════════════════════╝\n');

// ============================================
// HELPER FUNCTIONS
// ============================================
export const getIconPageByPath = (path) => {
  return iconPages.find(page => page.path === path);
};

export const getAllIconPages = () => {
  console.log('📁 [ICON LOADER] getAllIconPages called, total:', iconPages.length);
  return iconPages;
};

export const refreshIconPages = () => {
  console.log('🔄 [ICON LOADER] Refreshing icon pages...');
  const newIcons = discoverAllConfigs();
  iconPages.length = 0; // Clear array
  iconPages.push(...newIcons); // Add new items
  console.log('✅ [ICON LOADER] Icon pages refreshed:', iconPages.length);
  return iconPages;
};

// ============================================
// 🔥 GET ALL CONFIG LINKS DYNAMICALLY
// ============================================
export const getAllConfigLinks = () => {
  const allLinks = [];
  
  iconPages.forEach(icon => {
    if (icon.links && Array.isArray(icon.links)) {
      icon.links.forEach(link => {
        allLinks.push({
          ...link,
          sourceIcon: icon.name,
          sourceConfig: icon.configName,
          category: icon.displayName
        });
      });
    }
  });
  
  console.log('📋 [ICON LOADER] Total links across all configs:', allLinks.length);
  return allLinks;
};

// ============================================
// 🔥 GET ICON WITH ITS CONFIG FILES
// This is the KEY function for showing config files in icons
// ============================================
export const getIconWithConfigStructure = (iconName) => {
  const icon = iconPages.find(i => i.name === iconName);
  if (!icon) return null;
  
  return {
    name: icon.name,
    displayName: icon.displayName,
    path: icon.path,
    configFile: icon.configName,
    links: icon.links,
    component: icon.component
  };
};

// ============================================
// 🔥 GET ALL ICONS WITH STRUCTURE
// For LeftPanel to show Icon → Config → Sub-items
// ============================================
export const getAllIconsWithStructure = () => {
  return iconPages.map(icon => ({
    name: icon.name,
    displayName: icon.displayName,
    path: icon.path,
    configName: icon.configName,
    configDisplayName: icon.displayName,
    links: icon.links.map(link => ({
      ...link,
      category: icon.displayName
    })),
    linkCount: icon.links.length,
    component: icon.component
  }));
};

// ============================================
// DEBUG INFO
// ============================================
if (typeof window !== 'undefined') {
  window.iconPages = iconPages;
  window.refreshIconPages = refreshIconPages;
  window.getAllConfigLinks = getAllConfigLinks;
  window.getAllIconsWithStructure = getAllIconsWithStructure;
  window.getIconWithConfigStructure = getIconWithConfigStructure;
  
  console.log('🔧 [ICON LOADER] Debug functions available:');
  console.log('  - window.iconPages (current icons)');
  console.log('  - window.refreshIconPages() (reload configs)');
  console.log('  - window.getAllConfigLinks() (get all links)');
  console.log('  - window.getAllIconsWithStructure() (get structured data)');
  console.log('  - window.getIconWithConfigStructure(name) (get specific icon)');
  console.log('\n💡 Tip: Call window.refreshIconPages() to reload after adding new configs\n');
}
