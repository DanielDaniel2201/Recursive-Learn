/**
 * Recursive-Learn Background Service Worker
 * Handles extension lifecycle and message passing between components
 */

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Recursive-Learn installed successfully!');
    
    // Initialize default settings
    chrome.storage.local.set({
      trees: [],
      activeTreeId: null,
      settings: {
        viewMode: 'tree',
        sidebarWidth: 320,
        sidebarCollapsed: true
      }
    });
  }
});

// Listen for extension icon click to toggle sidebar
chrome.action.onClicked.addListener((tab) => {
  // Send message to content script to toggle sidebar
  chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' });
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getStorageData') {
    chrome.storage.local.get(null, (data) => {
      sendResponse(data);
    });
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'saveStorageData') {
    chrome.storage.local.set(message.data, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'checkUpdate') {
    const REMOTE_MANIFEST_URL = 'https://raw.githubusercontent.com/DanielDaniel2201/Recursive-Learn/main/package.json';
    
    fetch(REMOTE_MANIFEST_URL)
      .then(response => response.json())
      .then(remotePackage => {
        const localVersion = chrome.runtime.getManifest().version;
        const remoteVersion = remotePackage.version;
        
        // Simple semantic version comparison
        const hasUpdate = compareVersions(remoteVersion, localVersion) > 0;
        
        sendResponse({ hasUpdate, remoteVersion, localVersion });
      })
      .catch(error => {
        console.error('Check update failed:', error);
        sendResponse({ hasUpdate: false, error: error.message });
      });
      
    return true; // Keep channel open
  }
});

// Helper: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
function compareVersions(v1, v2) {
  if (!v1 || !v2) return 0;
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}
