/**
 * Storage utility for managing learning trees in chrome.storage.local
 */

const DEFAULT_STATE = { trees: [], activeTreeId: null, settings: {} };

function isExtensionContextValid() {
  return typeof chrome !== 'undefined' && chrome?.runtime?.id && chrome?.storage?.local;
}

function isContextInvalidatedError(error) {
  if (!error) return false;
  const message = typeof error === 'string' ? error : error.message;
  return typeof message === 'string' && message.includes('Extension context invalidated');
}

function safeGetAll() {
  if (!isExtensionContextValid()) {
    return Promise.resolve(DEFAULT_STATE);
  }

  return new Promise((resolve) => {
    chrome.storage.local.get(null, (data) => {
      const lastError = chrome.runtime?.lastError;
      if (lastError && isContextInvalidatedError(lastError)) {
        resolve(DEFAULT_STATE);
        return;
      }
      resolve(data || DEFAULT_STATE);
    });
  });
}

function safeSet(payload) {
  if (!isExtensionContextValid()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    chrome.storage.local.set(payload, () => {
      const lastError = chrome.runtime?.lastError;
      if (lastError && !isContextInvalidatedError(lastError)) {
        console.warn('[Recursive-Learn] Storage set failed:', lastError.message || lastError);
      }
      resolve();
    });
  });
}

const Storage = {
  /**
   * Get all storage data
   * @returns {Promise<Object>}
   */
  async getAll() {
    return safeGetAll();
  },

  /**
   * Get all learning trees
   * @returns {Promise<Array>}
   */
  async getTrees() {
    const data = await this.getAll();
    return data.trees || [];
  },

  /**
   * Get active tree ID
   * @returns {Promise<string|null>}
   */
  async getActiveTreeId() {
    const data = await this.getAll();
    return data.activeTreeId || null;
  },

  /**
   * Get active tree
   * @returns {Promise<Object|null>}
   */
  async getActiveTree() {
    const trees = await this.getTrees();
    const activeTreeId = await this.getActiveTreeId();
    
    if (!activeTreeId) return null;
    return trees.find(tree => tree.id === activeTreeId) || null;
  },

  /**
   * Get tree by conversation URL
   * @param {string} url 
   * @returns {Promise<Object|null>}
   */
  async getTreeByUrl(url) {
    const trees = await this.getTrees();
    return trees.find(tree => tree.conversationUrl === url) || null;
  },

  /**
   * Create a new learning tree
   * @param {string} rootTopic 
   * @param {string} conversationUrl 
   * @returns {Promise<Object>}
   */
  async createTree(rootTopic, conversationUrl) {
    const trees = await this.getTrees();
    const timestamp = Date.now();
    
    const newTree = {
      id: `tree_${timestamp}`,
      rootTopic: rootTopic,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      conversationUrl: conversationUrl,
      nodes: [
        {
          id: `node_${timestamp}`,
          label: rootTopic,
          parentId: null,
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      ]
    };

    trees.push(newTree);
    
    await safeSet({
      trees: trees,
      activeTreeId: newTree.id
    });

    return newTree;
  },

  /**
   * Add a node to the active tree
   * @param {string} label - Node label (topic name)
   * @param {string|null} parentLabel - Parent node label (null for root level)
   * @returns {Promise<Object|null>}
   */
  async addNode(label, parentLabel) {
    const trees = await this.getTrees();
    const activeTreeId = await this.getActiveTreeId();
    
    if (!activeTreeId) return null;

    const treeIndex = trees.findIndex(t => t.id === activeTreeId);
    if (treeIndex === -1) return null;

    const tree = trees[treeIndex];
    
    // Find parent node by label
    let parentId = null;
    if (parentLabel) {
      const parentNode = tree.nodes.find(n => n.label === parentLabel);
      parentId = parentNode ? parentNode.id : null;
    }

    // Check if node already exists
    const existingNode = tree.nodes.find(n => n.label === label);
    if (existingNode) {
      // Update status if exists
      existingNode.status = 'confirmed';
      tree.updatedAt = new Date().toISOString();
      await safeSet({ trees });
      return existingNode;
    }

    // Create new node
    const newNode = {
      id: `node_${Date.now()}`,
      label: label,
      parentId: parentId,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    tree.nodes.push(newNode);
    tree.updatedAt = new Date().toISOString();
    
    await safeSet({ trees });
    return newNode;
  },

  /**
   * Update node status
   * @param {string} nodeId 
   * @param {string} status 
   * @returns {Promise<boolean>}
   */
  async updateNodeStatus(nodeId, status) {
    const trees = await this.getTrees();
    const activeTreeId = await this.getActiveTreeId();
    
    if (!activeTreeId) return false;

    const tree = trees.find(t => t.id === activeTreeId);
    if (!tree) return false;

    const node = tree.nodes.find(n => n.id === nodeId);
    if (!node) return false;

    node.status = status;
    tree.updatedAt = new Date().toISOString();
    
    await safeSet({ trees });
    return true;
  },

  /**
   * Set active tree
   * @param {string} treeId 
   * @returns {Promise<void>}
   */
  async setActiveTree(treeId) {
    await safeSet({ activeTreeId: treeId || null });
  },

  /**
   * Get user settings
   * @returns {Promise<Object>}
   */
  async getSettings() {
    const data = await this.getAll();
    return data.settings || {
      viewMode: 'tree',
      sidebarWidth: 320,
      sidebarCollapsed: true
    };
  },

  /**
   * Update user settings
   * @param {Object} newSettings 
   * @returns {Promise<void>}
   */
  async updateSettings(newSettings) {
    const settings = await this.getSettings();
    const merged = { ...settings, ...newSettings };
    await safeSet({ settings: merged });
  },

  /**
   * Delete a tree
   * @param {string} treeId 
   * @returns {Promise<void>}
   */
  async deleteTree(treeId) {
    const trees = await this.getTrees();
    const activeTreeId = await this.getActiveTreeId();
    
    const filtered = trees.filter(t => t.id !== treeId);
    const newActiveId = activeTreeId === treeId ? null : activeTreeId;
    
    await safeSet({
      trees: filtered,
      activeTreeId: newActiveId
    });
  }
};

// Export for module systems or make globally available
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Storage;
} else {
  window.RecursiveLearnStorage = Storage;
}
