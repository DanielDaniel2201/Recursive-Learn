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
});
