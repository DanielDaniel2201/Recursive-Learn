/**
 * Recursive-Learn content script - Knowledge Garden Edition
 * Injects sidebar UI, handles prompt injection, and parses LEARN tags
 * Optimized for better UX with smooth animations and intuitive interactions
 */

(function () {
  'use strict';
  
  if (window.__recursiveLearnInitialized) {
    return;
  }
  window.__recursiveLearnInitialized = true;

  const STORAGE = window.RecursiveLearnStorage;
  const PROMPTS = window.RecursiveLearnPrompts;
  const DOM = window.RecursiveLearnDOMHelper;

  if (!STORAGE || !PROMPTS || !DOM) {
    console.error('[Recursive-Learn] Missing dependencies');
    return;
  }

  const state = {
    tree: null,
    selectedNodeId: null,
    sidebarCollapsed: true,
    sidebarDefaultCollapsed: true,
    pendingAutoCenter: false,
    suppressAutoFitUntil: 0,
    initializing: false,
    initialized: false,
    rootPromptInjected: false,
    rootSent: false,
    treeScale: 1,
    canvasX: 0,
    canvasY: 0,
    canvasScale: 1,
    viewInitialized: false,
    lastInjectedNodeId: null,
    lastInjectedAt: 0,
    zoomTargetNodeId: null,
    userHasPanned: false,
    preZoomView: null
  };

  const selectors = {
    sidebar: 'recursive-learn-sidebar',
    tree: 'recursive-learn-tree',
    treeViewport: 'recursive-learn-tree-viewport',
    canvas: 'recursive-learn-canvas',
    toast: 'recursive-learn-toast',
    historyPanel: 'recursive-learn-history-panel',
    historyList: 'recursive-learn-history-list',
    settingsPanel: 'recursive-learn-settings-panel'
  };

  // SVG Icons
  const icons = {
    logo: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
    plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
    history: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
    settings: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:1;"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0a2.34 2.34 0 0 0 3.319 1.915a2.34 2.34 0 0 1 2.33 4.033a2.34 2.34 0 0 0 0 3.831a2.34 2.34 0 0 1-2.33 4.033a2.34 2.34 0 0 0-3.319 1.915a2.34 2.34 0 0 1-4.659 0a2.34 2.34 0 0 0-3.32-1.915a2.34 2.34 0 0 1-2.33-4.033a2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>`,
    focus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>`,
    trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>`,
    send: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`,
    check: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
  };

  function createSidebar() {
    if (document.getElementById(selectors.sidebar)) {
      return;
    }

    const sidebar = document.createElement('div');
    sidebar.id = selectors.sidebar;
    sidebar.classList.add('rl-preload');
    sidebar.classList.add('rl-canvas-hidden');
    if (state.sidebarCollapsed) {
      sidebar.classList.add('collapsed');
    }
    sidebar.innerHTML = `
      <div class="rl-body rl-canvas-mode">
        <div class="rl-tree-viewport" id="${selectors.treeViewport}">
          <div class="rl-topbar">
            <div class="rl-topbar-left">
              <button class="rl-mini-btn rl-icon-only" type="button" data-action="new-tree" title="New tree" aria-label="New tree">
                ${icons.plus}
              </button>
              <button class="rl-mini-btn rl-icon-only" type="button" data-action="toggle-history" title="History trees" aria-label="History trees">
                ${icons.history}
              </button>
            </div>
            <div class="rl-topbar-right">
              <button class="rl-mini-btn rl-icon-only" type="button" data-action="toggle-settings" title="Settings" aria-label="Settings">
                ${icons.settings}
              </button>
              <button class="rl-mini-btn rl-focus-btn rl-icon-only" type="button" data-action="focus-tree" title="Auto focus" aria-label="Auto focus">
                ${icons.focus}
              </button>
            </div>
          </div>
          <div class="rl-history" id="${selectors.historyPanel}">
            <div class="rl-history-list" id="${selectors.historyList}"></div>
          </div>
          <div class="rl-settings" id="${selectors.settingsPanel}">
            <div class="rl-settings-title">Sidebar</div>
            <label class="rl-settings-row">
              <span>Start collapsed</span>
              <input type="checkbox" data-setting="sidebarCollapsed" />
            </label>
          </div>
          <div class="rl-canvas" id="${selectors.canvas}">
            <div class="rl-tree" id="${selectors.tree}">
              <svg id="rl-tree-canvas" class="rl-canvas-container" aria-hidden="true"></svg>
            </div>
          </div>
        </div>
      </div>

      <div class="rl-toast" id="${selectors.toast}">
        <div class="rl-toast-icon">
          ${icons.check}
        </div>
        <div class="rl-toast-message"></div>
      </div>
    `;

    document.body.appendChild(sidebar);
    attachSidebarEvents(sidebar);
    setupKeyboardShortcuts();
    setupCanvasInteractions();
  }

  function finalizeSidebar() {
    const sidebar = document.getElementById(selectors.sidebar);
    if (!sidebar) return;
    sidebar.classList.toggle('collapsed', state.sidebarCollapsed);
    document.body.classList.add('recursive-learn-active');
    document.body.classList.toggle('recursive-learn-collapsed', state.sidebarCollapsed);
    requestAnimationFrame(() => {
      sidebar.classList.remove('rl-preload');
      if (!state.sidebarCollapsed) {
        sidebar.classList.remove('rl-canvas-hidden');
      }
    });
  }

  function attachSidebarEvents(sidebar) {
    // Event delegation for all clicks
    sidebar.addEventListener('click', (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const targetElement = event.target instanceof Element ? event.target : null;
      if (targetElement && targetElement.closest('.rl-node-input-area, .rl-node-input-field')) {
        return;
      }

      const historyPanel = document.getElementById(selectors.historyPanel);
    if (historyPanel && historyPanel.classList.contains('open')) {
      const isHistoryToggle = targetElement && targetElement.closest('[data-action="toggle-history"]');
      const isHistoryClick = targetElement && targetElement.closest(`#${selectors.historyPanel}`);
      if (!isHistoryToggle && !isHistoryClick) {
        historyPanel.classList.remove('open');
        historyPanel.scrollTop = 0;
      }
    }

      const settingsPanel = document.getElementById(selectors.settingsPanel);
      if (settingsPanel && settingsPanel.classList.contains('open')) {
        const isSettingsToggle = targetElement && targetElement.closest('[data-action="toggle-settings"]');
        const isSettingsClick = targetElement && targetElement.closest(`#${selectors.settingsPanel}`);
        if (!isSettingsToggle && !isSettingsClick) {
          settingsPanel.classList.remove('open');
        }
      }

      const target = event.target.closest('[data-action], [data-node-id]');
      if (!target) return;

      const action = target.getAttribute('data-action');
      const nodeId = target.getAttribute('data-node-id');

      if (action) {
        event.preventDefault();
        handleAction(action, target);
        return;
      }

      if (nodeId) {
        event.preventDefault();
        selectNode(nodeId);
      }
    });

    // Keyboard support for inputs
    sidebar.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        const target = event.target;
        if (target instanceof HTMLInputElement && target.dataset.nodeId === 'root') {
          event.preventDefault();
          handleRootInject();
        }
      }
    });

    document.addEventListener('pointerdown', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (!isSidebarInputFocused()) return;
      if (target.closest('.rl-node-input-area, .rl-node-input-field')) return;
      const focused = document.activeElement;
      if (focused && (focused.tagName === 'TEXTAREA' || focused.tagName === 'INPUT')) {
        focused.blur();
      }
    });
  }

  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Ctrl/Cmd + B to toggle sidebar
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        toggleSidebar();
      }
    });
  }

  function handleAction(action, target) {
    switch (action) {
      case 'toggle':
        toggleSidebar();
        break;
      case 'root-send':
        handleRootInject();
        break;
      case 'node-send':
        handleSubtopicsInject(target.dataset.nodeId);
        break;
      case 'new-tree':
        handleNewTree();
        break;
      case 'toggle-history':
        toggleHistoryPanel();
        break;
      case 'toggle-settings':
        toggleSettingsPanel();
        break;
      case 'focus-tree':
        state.userHasPanned = false;
        fitCanvasToTree();
        break;
      case 'load-tree':
        handleLoadTree(target.dataset.treeId);
        break;
      case 'delete-tree':
        handleDeleteTree(target.dataset.treeId);
        break;
      default:
        console.warn(`[Recursive-Learn] Unknown action: ${action}`);
    }
  }

  function toggleHistoryPanel() {
    const panel = document.getElementById(selectors.historyPanel);
    if (!panel) return;
    const settingsPanel = document.getElementById(selectors.settingsPanel);
    if (settingsPanel) {
      settingsPanel.classList.remove('open');
    }
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
      const activeItem = panel.querySelector('.rl-history-item.active');
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    } else {
      panel.scrollTop = 0;
    }
  }

  function toggleSettingsPanel() {
    const panel = document.getElementById(selectors.settingsPanel);
    if (!panel) return;
    const historyPanel = document.getElementById(selectors.historyPanel);
    if (historyPanel) {
      historyPanel.classList.remove('open');
      historyPanel.scrollTop = 0;
    }
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
      syncSettingsUI();
    }
  }

  function applySidebarCollapsedState(collapsed, options = {}) {
    const sidebar = document.getElementById(selectors.sidebar);
    if (!sidebar) return;
    state.sidebarCollapsed = collapsed;
    sidebar.classList.toggle('collapsed', collapsed);
    document.body.classList.toggle('recursive-learn-collapsed', collapsed);

    const toggleBtn = sidebar.querySelector('[data-action="toggle"]');
    if (toggleBtn) {
      toggleBtn.innerHTML = icons.logo;
      toggleBtn.title = collapsed ? '展开' : '收起';
    }

    const historyPanel = document.getElementById(selectors.historyPanel);
    if (historyPanel) {
      historyPanel.classList.remove('open');
      historyPanel.scrollTop = 0;
    }
    const settingsPanel = document.getElementById(selectors.settingsPanel);
    if (settingsPanel) {
      settingsPanel.classList.remove('open');
    }

    if (options.persist !== false) {
      state.sidebarDefaultCollapsed = collapsed;
      state.sidebarCollapsed = collapsed;
      updateSettings({ sidebarCollapsed: collapsed });
    }
    syncSettingsUI();

    // 侧边栏切换有动画，延迟重绘
    setTimeout(drawTreeCurves, 400);

    if (!collapsed) {
      state.suppressAutoFitUntil = Date.now() + 700;
      sidebar.classList.add('rl-canvas-hidden');
      setTimeout(() => {
        state.pendingAutoCenter = true;
        renderTree();
        requestAnimationFrame(() => {
          sidebar.classList.remove('rl-canvas-hidden');
        });
      }, 620);
    }
  }

  async function handleNewTree() {
    try {
      state.tree = null;
      state.selectedNodeId = null;
      state.rootPromptInjected = false;
      state.rootSent = false;
      state.viewInitialized = false;
      state.userHasPanned = false;
      state.pendingAutoCenter = true;
      await STORAGE.setActiveTree(null);
      const panel = document.getElementById(selectors.historyPanel);
      if (panel) {
        panel.classList.remove('open');
        panel.scrollTop = 0;
      }
      const settingsPanel = document.getElementById(selectors.settingsPanel);
      if (settingsPanel) {
        settingsPanel.classList.remove('open');
      }
      renderTree();
      renderHistoryList();
      showToast('已创建新树');
    } catch (error) {
      console.error('[Recursive-Learn] Error creating new tree:', error);
      showToast('新建失败，请重试');
    }
  }

  async function handleLoadTree(treeId) {
    if (!treeId) return;
    const trees = await STORAGE.getTrees();
    const found = trees.find((tree) => tree.id === treeId);
    if (!found) {
      showToast('未找到该树');
      return;
    }
    state.tree = found;
    await STORAGE.setActiveTree(found.id);
    state.rootSent = !DOM.isNewConversation();
    state.viewInitialized = false;
    state.userHasPanned = false;
    state.pendingAutoCenter = true;
    const panel = document.getElementById(selectors.historyPanel);
    if (panel) {
      panel.classList.remove('open');
      panel.scrollTop = 0;
    }
    const settingsPanel = document.getElementById(selectors.settingsPanel);
    if (settingsPanel) {
      settingsPanel.classList.remove('open');
    }
    renderTree();
    renderHistoryList();
    showToast('已加载历史树');
  }

  async function handleDeleteTree(treeId) {
    if (!treeId) return;
    try {
      const isActive = state.tree && state.tree.id === treeId;
      await STORAGE.deleteTree(treeId);
      if (isActive) {
        state.tree = null;
        state.selectedNodeId = null;
        state.rootPromptInjected = false;
        state.rootSent = false;
        state.viewInitialized = false;
        state.userHasPanned = false;
        state.pendingAutoCenter = true;
      }
      renderTree();
      renderHistoryList();
      showToast('已删除历史树');
    } catch (error) {
      console.error('[Recursive-Learn] Error deleting tree:', error);
      showToast('删除失败，请重试');
    }
  }



  function checkUpdate() {
    if (!chrome.runtime || !chrome.runtime.sendMessage) return;
    
    chrome.runtime.sendMessage({ action: 'checkUpdate' }, (response) => {
      // Check for lastError to avoid "The message port closed before a response was received"
      if (chrome.runtime.lastError) {
        // Background script might be sleeping or unreachable
        return;
      }
      
      if (response && response.hasUpdate) {
        showUpdateBanner(response.remoteVersion);
      }
    });
  }

  function showUpdateBanner(version) {
    const sidebar = document.getElementById(selectors.sidebar);
    if (!sidebar) return;

    // Remove existing banner if any
    const existing = sidebar.querySelector('.rl-update-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.className = 'rl-update-banner';
    banner.innerHTML = `
      <div class="rl-update-content">
        <strong>New version available (v${version})</strong>
        <span class="rl-update-desc">Run the update script in your folder.</span>
      </div>
      <button class="rl-update-close" title="Dismiss">×</button>
    `;

    const closeBtn = banner.querySelector('.rl-update-close');
    closeBtn.addEventListener('click', () => {
      banner.remove();
    });

    // Insert at top of sidebar body
    const body = sidebar.querySelector('.rl-body');
    if (body) {
      body.insertBefore(banner, body.firstChild);
    }
  }

  async function initialize() {
    if (state.initialized || state.initializing) {
      return;
    }
    state.initializing = true;
    createSidebar();
    
    // Check for updates shortly after init
    setTimeout(checkUpdate, 2000);

    try {
      const settings = await STORAGE.getSettings();
      state.sidebarDefaultCollapsed = settings.sidebarCollapsed ?? true;
      state.sidebarCollapsed = state.sidebarDefaultCollapsed;

      const sidebar = document.getElementById(selectors.sidebar);
      if (sidebar) {
        const toggleBtn = sidebar.querySelector('[data-action="toggle"]');
        if (toggleBtn) {
          toggleBtn.innerHTML = icons.logo;
          toggleBtn.title = state.sidebarCollapsed ? '展开' : '收起';
        }
      }

      await loadTreeForConversation();
      await loadLatestTree();
      if (state.tree && state.tree.nodes.length > 0) {
        state.rootSent = !DOM.isNewConversation();
      }
      syncSettingsUI();
      renderTree();
      await renderHistoryList();
      setupSendListener();
      setupMessageObserver();
      finalizeSidebar();

      state.initialized = true;
      state.initializing = false;
      console.log('[Recursive-Learn] Initialized successfully');
    } catch (error) {
      console.error('[Recursive-Learn] Initialization error:', error);
      showToast('初始化失败，请刷新页面重试');
      state.initializing = false;
    }
  }

  function setupMessageObserver() {
    const observer = DOM.createMessageObserver(() => {
      if (!state.tree) return;
      state.rootSent = !DOM.isNewConversation();
      renderTree();
      renderHistoryList();
    });

    if (!observer) {
      console.warn('[Recursive-Learn] Failed to attach message observer');
    }
  }

  async function loadTreeForConversation() {
    try {
      const url = DOM.getConversationUrl();
      const existing = await STORAGE.getTreeByUrl(url);
      if (existing) {
        state.tree = existing;
        await STORAGE.setActiveTree(existing.id);
        return;
      }
      state.tree = null;
      await STORAGE.setActiveTree(null);
    } catch (error) {
      console.error('[Recursive-Learn] Error loading tree:', error);
    }
  }

  async function loadLatestTree() {
    try {
      const trees = await STORAGE.getTrees();
      if (!trees || trees.length === 0) {
        state.tree = null;
        return;
      }
      const latest = [...trees].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
      state.tree = latest;
      await STORAGE.setActiveTree(latest.id);
      state.pendingAutoCenter = true;
      state.viewInitialized = false;
      state.userHasPanned = false;
    } catch (error) {
      console.error('[Recursive-Learn] Error loading latest tree:', error);
    }
  }

  function formatTreeLabel(tree) {
    const date = new Date(tree.updatedAt || tree.createdAt || Date.now());
    const label = tree.rootTopic || '未命名主题';
    return `${label} · ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }

  async function renderHistoryList() {
    const list = document.getElementById(selectors.historyList);
    if (!list) return;

    const trees = await STORAGE.getTrees();
    list.innerHTML = '';

    if (!trees || trees.length === 0) {
      list.innerHTML = '<div class="rl-history-empty">暂无历史树</div>';
      return;
    }

    const sorted = [...trees].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    sorted.forEach((tree, index) => {
      const item = document.createElement('div');
      item.className = 'rl-history-item';
      if (!state.tree && index === 0) {
        item.classList.add('active');
      }
      if (state.tree && tree.id === state.tree.id) {
        item.classList.add('active');
      }

      const labelBtn = document.createElement('button');
      labelBtn.type = 'button';
      labelBtn.className = 'rl-history-label';
      labelBtn.dataset.action = 'load-tree';
      labelBtn.dataset.treeId = tree.id;
      labelBtn.textContent = formatTreeLabel(tree);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'rl-history-delete';
      deleteBtn.dataset.action = 'delete-tree';
      deleteBtn.dataset.treeId = tree.id;
      deleteBtn.title = 'Delete tree';
      deleteBtn.innerHTML = icons.trash;

      item.appendChild(labelBtn);
      item.appendChild(deleteBtn);
      list.appendChild(item);
    });
    const activeItem = list.querySelector('.rl-history-item.active');
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest' });
    }
  }

  function setupSendListener() {
    const sendButton = DOM.getSendButton();
    if (!sendButton) return;

    sendButton.addEventListener('click', () => {
      if (!state.rootPromptInjected || state.rootSent) return;
      updateRootSentState(true);
    });
  }

  async function handleRootInject() {
    const input = document.querySelector('input[data-node-id="root"]');
    if (!input) return;

    const topic = input.value.trim();
    if (!topic) {
      showToast('请输入学习主题');
      input.focus();
      return;
    }

    if (!state.rootPromptInjected) {
      const prompt = PROMPTS.getInitPrompt(topic);
      DOM.injectPrompt(prompt);
      state.rootPromptInjected = true;
      showToast('已注入到输入框，请点击发送');
    }

    try {
      const conversationUrl = DOM.getConversationUrl();
      const tree = await STORAGE.createTree(topic, conversationUrl);
      state.tree = tree;
      state.selectedNodeId = tree.nodes[0].id;
      state.rootSent = false;
      state.viewInitialized = false;
      state.userHasPanned = false;
      state.preZoomView = null;
      state.pendingAutoCenter = true;

      renderTree();
      renderHistoryList();
      input.value = '';
    } catch (error) {
      console.error('[Recursive-Learn] Error starting learning:', error);
      showToast('开始学习失败，请重试');
    }
  }

  async function handleSubtopicsInject(nodeId) {
    const input = document.querySelector(`textarea[data-node-id="${nodeId}"]`);
    if (!input) return;

    const raw = input.value.trim();
    if (!raw) {
      showToast('请输入子主题');
      input.focus();
      return;
    }

    const topics = raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (topics.length === 0) {
      showToast('请输入有效的子主题');
      input.focus();
      return;
    }

    try {
      let parentNode = state.tree?.nodes.find((node) => node.id === nodeId);
      if (nodeId === 'root') {
        parentNode = state.tree?.nodes.find((node) => node.parentId === null) || parentNode;
      }
      if (!parentNode) {
        showToast('找不到父节点');
        return;
      }

      for (const topic of topics) {
        await STORAGE.addNode(topic, parentNode.label);
      }

      state.tree = await STORAGE.getActiveTree();
      state.userHasPanned = false;
      state.preZoomView = null;
      state.pendingAutoCenter = true;
      renderTree();
      renderHistoryList();
      input.value = '';
      showToast('子主题已添加');
    } catch (error) {
      console.error('[Recursive-Learn] Error adding subtopics:', error);
      showToast('添加失败，请重试');
    }
  }


  function renderTree() {
    const treeRoot = document.getElementById(selectors.tree);
    if (!treeRoot) return;

    treeRoot.innerHTML = '';
    
    // Re-add SVG canvas as it's inside treeRoot now
    const canvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    canvas.id = 'rl-tree-canvas';
    canvas.setAttribute('class', 'rl-canvas-container');
    canvas.setAttribute('aria-hidden', 'true');
    treeRoot.appendChild(canvas);

    if (!state.tree || state.tree.nodes.length === 0) {
      treeRoot.appendChild(buildRootInput());
      updateRootSentState(false);
      focusRootInput();
      requestAnimationFrame(() => {
        if (state.pendingAutoCenter || !state.viewInitialized) {
          resetCanvasView();
          state.pendingAutoCenter = false;
        }
      });
      // clearTreeCurves not needed as we just recreated empty canvas
      return;
    }

    const rootNodes = state.tree.nodes.filter((node) => node.parentId === null);
    if (rootNodes.length === 0) {
      treeRoot.appendChild(buildRootInput());
      updateRootSentState(false);
      focusRootInput();
      requestAnimationFrame(() => {
        if (state.pendingAutoCenter || !state.viewInitialized) {
          resetCanvasView();
          state.pendingAutoCenter = false;
        }
      });
      return;
    }

    const rootNode = rootNodes[0];
    const rootGroup = document.createElement('div');
    rootGroup.className = 'rl-node-group rl-root-group';

    const rootWrapper = document.createElement('div');
    rootWrapper.className = 'rl-node-wrapper rl-node-root-wrapper';
      if (state.rootSent) rootWrapper.classList.add('is-sent');

    const rootContent = document.createElement('div');
    rootContent.className = 'rl-node-content';

      const rootInput = buildRootInput({
        rootTopic: rootNode.label,
        readOnly: true,
        labelText: 'Master Topic',
        nodeId: rootNode.id
      });

    rootContent.appendChild(rootInput);
    rootWrapper.appendChild(rootContent);
    rootGroup.appendChild(rootWrapper);

    const children = state.tree.nodes.filter((node) => node.parentId === rootNode.id);
    if (children.length > 0) {
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'rl-tree-children';
      children.forEach((child) => {
        childrenContainer.appendChild(buildRecursiveNode(child, state.tree.nodes));
      });
      rootGroup.appendChild(childrenContainer);
    }

    treeRoot.appendChild(rootGroup);
    updateRootSentState(state.rootSent);

    // 自适应布局并绘制曲线
    requestAnimationFrame(() => {
      updateTreeLayout();
      drawTreeCurves();
      if ((state.pendingAutoCenter || (!state.viewInitialized && !state.userHasPanned)) && Date.now() > state.suppressAutoFitUntil) {
        if (state.pendingAutoCenter) {
          fitCanvasToTree();
          state.pendingAutoCenter = false;
        }
        const historyPanel = document.getElementById(selectors.historyPanel);
        if (historyPanel && historyPanel.classList.contains('open')) {
          const activeItem = historyPanel.querySelector('.rl-history-item.active');
          if (activeItem) {
            activeItem.scrollIntoView({ block: 'nearest' });
          }
        }
      }
    });
  }

  function focusRootInput() {
    const input = document.querySelector('input[data-node-id="root"]');
    if (input) {
      input.focus();
    }
  }

  function clearTreeCurves() {
    const canvas = document.getElementById('rl-tree-canvas');
    if (canvas) {
      canvas.innerHTML = '';
    }
  }

  function updateTreeLayout() {
    // Keep for potential future layout adjustments
    // Currently relying on CSS and natural flow
    state.treeScale = 1;
    const treeRoot = document.getElementById(selectors.tree);
    if (treeRoot) {
      treeRoot.style.transform = 'none';
    }
  }

  function getTreeViewport() {
    return document.getElementById(selectors.treeViewport);
  }

  function getCanvasWrap() {
    return document.getElementById(selectors.canvas);
  }

  function applyCanvasTransform() {
    const canvas = getCanvasWrap();
    if (!canvas) return;
    canvas.style.transform = `translate(${state.canvasX || 0}px, ${state.canvasY || 0}px) scale(${state.canvasScale || 1})`;
  }

  function isSidebarInputFocused() {
    const active = document.activeElement;
    if (!active) return false;
    if (!(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) return false;
    return Boolean(active.closest(`#${selectors.sidebar}`));
  }

  function scheduleZoomOutIfIdle() {
    setTimeout(() => {
      if (!isSidebarInputFocused()) {
        zoomOutToFit();
      }
    }, 0);
  }

  function zoomOutToFit() {
    const viewport = getTreeViewport();
    if (!viewport) return;
    requestAnimationFrame(() => {
      if (state.preZoomView) {
        state.canvasX = state.preZoomView.x;
        state.canvasY = state.preZoomView.y;
        state.canvasScale = state.preZoomView.scale;
        applyCanvasTransform();
        state.preZoomView = null;
      } else {
        fitCanvasToTree();
      }
      state.zoomTargetNodeId = null;
      state.pendingAutoCenter = false;
    });
  }

  function zoomToNodeInput(nodeId) {
    const viewport = getTreeViewport();
    const canvas = getCanvasWrap();
    const treeRoot = document.getElementById(selectors.tree);
    if (!viewport || !canvas || !treeRoot || !nodeId) return;

    if (!state.preZoomView) {
      state.preZoomView = {
        x: state.canvasX || 0,
        y: state.canvasY || 0,
        scale: state.canvasScale || 1
      };
    }

    let target = null;
    if (nodeId === 'root') {
      target = treeRoot.querySelector('.rl-node-root-wrapper .rl-node-content')
        || treeRoot.querySelector('.rl-node-root .rl-node-card')
        || treeRoot.querySelector('.rl-node-root .rl-node-input-field')
        || treeRoot.querySelector('input[data-node-id="root"]')
        || treeRoot.querySelector('textarea[data-node-id="root"]');
    } else {
      const nodeWrapper = treeRoot.querySelector(`.rl-node-wrapper[data-node-id="${nodeId}"]`);
      target = nodeWrapper?.querySelector('.rl-node-content')
        || treeRoot.querySelector(`.rl-node-card[data-node-id="${nodeId}"]`)
        || treeRoot.querySelector(`.rl-node-input-field[data-node-id="${nodeId}"]`);
    }

    if (!target) return;

    const viewportRect = viewport.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const minScale = 1;
    const maxScale = 1.8;
    const desiredWidth = viewportRect.width * 0.75;
    const baseScale = (state.canvasScale || 1);
    const nodeWidth = Math.max(1, targetRect.width);
    const nextScale = Math.min(maxScale, Math.max(minScale, (desiredWidth / nodeWidth) * baseScale));

    const targetCenterX = targetRect.left - viewportRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top - viewportRect.top + targetRect.height / 2;
    const desiredCenterX = viewportRect.width / 2;
    const desiredCenterY = viewportRect.height / 2;
    const currentX = state.canvasX || 0;
    const currentY = state.canvasY || 0;

    state.canvasScale = nextScale;
    state.canvasX = desiredCenterX - (targetCenterX - currentX) * (nextScale / baseScale);
    state.canvasY = desiredCenterY - (targetCenterY - currentY) * (nextScale / baseScale);
    applyCanvasTransform();
  }

  function resetCanvasView() {
    const viewport = getTreeViewport();
    const canvas = getCanvasWrap();
    const treeRoot = document.getElementById(selectors.tree);
    if (!viewport || !canvas || !treeRoot) return;

    state.canvasScale = 1;
    canvas.style.transform = 'translate(0px, 0px) scale(1)';

    const focusTarget = treeRoot.querySelector('.rl-node-root-wrapper .rl-node-card') ||
      treeRoot.querySelector('.rl-node-root .rl-node-card') ||
      treeRoot.querySelector('.rl-node-card') ||
      treeRoot.querySelector('input[data-node-id="root"]');
    const viewportRect = viewport.getBoundingClientRect();

    const targetPos = focusTarget ? getRelativePos(focusTarget, treeRoot) : { x: 0, y: 0 };
    const targetWidth = focusTarget?.offsetWidth || 0;
    const targetHeight = focusTarget?.offsetHeight || 0;

    const desiredCenterX = viewportRect.width / 2;
    const desiredTop = 16;

    const targetCenterX = targetPos.x + targetWidth / 2;
    const targetTop = targetPos.y;

    state.canvasX = desiredCenterX - targetCenterX;
    state.canvasY = desiredTop - targetTop;
    applyCanvasTransform();
    state.viewInitialized = true;
    state.userHasPanned = false;
    state.preZoomView = null;

    const rootWrapper = treeRoot.querySelector('.rl-node-root-wrapper');
    if (rootWrapper) {
      rootWrapper.classList.add('is-focused');
      setTimeout(() => {
        rootWrapper.classList.remove('is-focused');
      }, 1200);
    } else if (focusTarget && focusTarget instanceof HTMLElement) {
      focusTarget.classList.add('is-focused');
      setTimeout(() => {
        focusTarget.classList.remove('is-focused');
      }, 1200);
    }
  }

  function fitCanvasToTree() {
    const viewport = getTreeViewport();
    const canvas = getCanvasWrap();
    const treeRoot = document.getElementById(selectors.tree);
    if (!viewport || !canvas || !treeRoot) return;

    if (state.userHasPanned && !state.zoomTargetNodeId) {
      return;
    }

    const nodes = treeRoot.querySelectorAll('.rl-node-content');
    const fallback = treeRoot.querySelector('input[data-node-id="root"], .rl-node-content');

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    if (nodes.length > 0) {
      nodes.forEach((node) => {
        const pos = getRelativePos(node, treeRoot);
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + node.offsetWidth);
        maxY = Math.max(maxY, pos.y + node.offsetHeight);
      });
    } else if (fallback) {
      const pos = getRelativePos(fallback, treeRoot);
      minX = pos.x;
      minY = pos.y;
      maxX = pos.x + fallback.offsetWidth;
      maxY = pos.y + fallback.offsetHeight;
    } else {
      return;
    }

    const viewportRect = viewport.getBoundingClientRect();
    const pad = 24;
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const availableWidth = Math.max(1, viewportRect.width - pad * 2);
    const availableHeight = Math.max(1, viewportRect.height - pad * 2);
    const scale = Math.min(1.35, Math.max(0.55, Math.min(availableWidth / contentWidth, availableHeight / contentHeight)));

    const centeredX = pad + (availableWidth - contentWidth * scale) / 2;
    const centeredY = pad + (availableHeight - contentHeight * scale) / 2;

    state.canvasScale = scale;
    state.canvasX = centeredX - minX * scale;
    state.canvasY = centeredY - minY * scale;
    applyCanvasTransform();
    state.viewInitialized = true;
    state.userHasPanned = false;
    state.pendingAutoCenter = false;
  }

  function setupCanvasInteractions() {
    const viewport = getTreeViewport();
    if (!viewport) return;

    let isPanning = false;
    let startX = 0;
    let startY = 0;
    let startCanvasX = 0;
    let startCanvasY = 0;

    const onPointerDown = (event) => {
      if (event.button !== 0) return;
      if (event.target.closest('input, textarea, button')) return;
      isPanning = true;
      viewport.classList.add('is-panning');
      startX = event.clientX;
      startY = event.clientY;
      startCanvasX = state.canvasX || 0;
      startCanvasY = state.canvasY || 0;
    };

    const onPointerMove = (event) => {
      if (!isPanning) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      state.canvasX = startCanvasX + dx;
      state.canvasY = startCanvasY + dy;
      state.userHasPanned = true;
      state.preZoomView = null;
      state.pendingAutoCenter = false;
      applyCanvasTransform();
    };

    const onPointerUp = (event) => {
      if (!isPanning) return;
      isPanning = false;
      viewport.classList.remove('is-panning');
    };

    const onWheel = (event) => {
      const canvas = getCanvasWrap();
      if (!canvas) return;
      const viewportRect = viewport.getBoundingClientRect();

      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const scale = state.canvasScale || 1;
        const nextScale = Math.min(1.6, Math.max(0.5, scale * (1 - event.deltaY * 0.001)));
        const pointerX = event.clientX - viewportRect.left;
        const pointerY = event.clientY - viewportRect.top;
        const ratio = nextScale / scale;
        state.canvasX = pointerX - ratio * (pointerX - (state.canvasX || 0));
        state.canvasY = pointerY - ratio * (pointerY - (state.canvasY || 0));
        state.canvasScale = nextScale;
        state.userHasPanned = true;
        state.preZoomView = null;
        state.pendingAutoCenter = false;
        applyCanvasTransform();
        return;
      }

      state.canvasX = (state.canvasX || 0) - event.deltaX;
      state.canvasY = (state.canvasY || 0) - event.deltaY;
      state.userHasPanned = true;
      state.preZoomView = null;
      state.pendingAutoCenter = false;
      applyCanvasTransform();
    };

    viewport.addEventListener('pointerdown', onPointerDown);
    viewport.addEventListener('pointermove', onPointerMove);
    viewport.addEventListener('pointerup', onPointerUp);
    viewport.addEventListener('pointercancel', onPointerUp);
    viewport.addEventListener('wheel', onWheel, { passive: false });
  }

  function getRelativePos(el, root) {
    let x = 0;
    let y = 0;
    let current = el;
    while (current && current !== root) {
      x += current.offsetLeft;
      y += current.offsetTop;
      current = current.offsetParent;
    }
    return { x, y };
  }

  function drawTreeCurves() {
    const canvas = document.getElementById('rl-tree-canvas');
    const treeRoot = document.getElementById(selectors.tree);
    if (!canvas || !treeRoot) return;

    // Canvas covers the entire tree area
    const width = treeRoot.scrollWidth;
    const height = treeRoot.scrollHeight;

    canvas.setAttribute('viewBox', `0 0 ${width} ${height}`);
    canvas.setAttribute('width', width);
    canvas.setAttribute('height', height);
    canvas.innerHTML = '';

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'rl-curve-gradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '0%');
    gradient.setAttribute('y2', '100%');
    
    const stops = [
      { offset: '0%', color: 'rgba(197, 160, 89, 0.4)' },
      { offset: '50%', color: 'rgba(197, 160, 89, 0.8)' },
      { offset: '100%', color: 'rgba(197, 160, 89, 0.4)' }
    ];
    
    stops.forEach(stop => {
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      s.setAttribute('offset', stop.offset);
      s.setAttribute('stop-color', stop.color);
      gradient.appendChild(s);
    });
    defs.appendChild(gradient);
    canvas.appendChild(defs);

    const childrenContainers = treeRoot.querySelectorAll('.rl-tree-children');
    
    childrenContainers.forEach(container => {
      const parentNode = container.parentElement;
      if (!parentNode) return;

      const parentWrapper = parentNode.querySelector(':scope > .rl-node-wrapper');
      if (!parentWrapper) return;

      let parentTarget = parentWrapper.querySelector('.rl-node-input-area');
      if (!parentTarget) parentTarget = parentWrapper.querySelector('.rl-node-input');
      if (!parentTarget) parentTarget = parentWrapper.querySelector('.rl-input-line');
      if (!parentTarget) parentTarget = parentWrapper.querySelector('.rl-node-card');

      if (!parentTarget) return;

      const pPos = getRelativePos(parentTarget, treeRoot);
      const startX = pPos.x + parentTarget.offsetWidth / 2;
      const startY = pPos.y + parentTarget.offsetHeight;

      const childrenWrappers = container.querySelectorAll(':scope > .rl-tree-node > .rl-node-wrapper');
      
      childrenWrappers.forEach(childWrapper => {
        const childCard = childWrapper.querySelector('.rl-node-card');
        if (!childCard) return;

        const cPos = getRelativePos(childCard, treeRoot);
        const endX = cPos.x + childCard.offsetWidth / 2;
        const endY = cPos.y;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        const distY = endY - startY;
        const controlY1 = startY + distY * 0.5;
        const controlY2 = endY - distY * 0.5;

        const d = `M ${startX} ${startY} C ${startX} ${controlY1}, ${endX} ${controlY2}, ${endX} ${endY}`;

        path.setAttribute('d', d);
        path.setAttribute('stroke', 'url(#rl-curve-gradient)');
        path.setAttribute('stroke-width', '1.5');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        
        canvas.appendChild(path);
      });
    });
  }



  function buildRootInput(options = {}) {
    const { rootTopic = '', readOnly = false, labelText = 'Learning Theme', nodeId = 'root' } = options;
    const container = document.createElement('div');
    container.className = 'rl-node rl-node-root';
    if (readOnly) {
      container.classList.toggle('is-sent', state.rootSent);
    }

    // For new study (readOnly = false), we show a clean input card
    // For existing study (readOnly = true), we show the topic card + input area

    if (!readOnly) {
      // NEW STUDY STATE
      const card = document.createElement('div');
      card.className = 'rl-node-card rl-root-card-new';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'rl-node-input-field';
    input.placeholder = 'Define your study focus...';
    input.dataset.nodeId = 'root';

      const button = document.createElement('button');
      button.className = 'rl-btn-icon hidden';
      button.dataset.action = 'root-send';
      button.title = 'Initialize Study';
      button.innerHTML = icons.send;

      input.addEventListener('input', () => {
        button.classList.toggle('hidden', input.value.trim().length === 0);
      });

      input.addEventListener('focus', () => {
        state.zoomTargetNodeId = 'root';
        state.userHasPanned = false;
        requestAnimationFrame(() => {
          zoomToNodeInput('root');
        });
      });

      input.addEventListener('blur', () => {
        if (state.zoomTargetNodeId === 'root') {
          state.zoomTargetNodeId = null;
        }
        scheduleZoomOutIfIdle();
      });

      input.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
      });
      input.addEventListener('mousedown', (event) => {
        event.stopPropagation();
      });
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleRootInject();
        }
      });

      card.appendChild(input);
      card.appendChild(button);
      container.appendChild(card);
    } else {
      // EXISTING STUDY STATE
      const card = document.createElement('div');
      card.className = 'rl-node-card';
      card.setAttribute('data-node-id', nodeId);
      
      const title = document.createElement('div');
      title.className = 'rl-node-title';
      title.textContent = rootTopic;
      
      card.appendChild(title);
      container.appendChild(card);

      // Input Area
      const inputWrap = document.createElement('div');
      inputWrap.className = 'rl-node-input-area';
      
      const inputContainer = document.createElement('div');
      inputContainer.className = 'rl-node-input-container';

      const textarea = document.createElement('textarea');
      textarea.rows = 3;
      textarea.placeholder = 'Deconstruct into sub-topics...';
      textarea.dataset.nodeId = 'root';
      textarea.className = 'rl-node-input-field';

      const actionRow = document.createElement('div');
      actionRow.className = 'rl-node-actions';

      const sendButton = document.createElement('button');
      sendButton.className = 'rl-btn-icon hidden';
      sendButton.dataset.action = 'node-send';
      sendButton.dataset.nodeId = 'root';
      sendButton.innerHTML = icons.send;

      sendButton.addEventListener('click', (event) => {
        event.preventDefault();
      handleSubtopicsInject('root');
    });

    textarea.addEventListener('input', () => {
      sendButton.classList.toggle('hidden', textarea.value.trim().length === 0);
    });

      textarea.addEventListener('focus', () => {
        state.zoomTargetNodeId = 'root';
        state.userHasPanned = false;
        requestAnimationFrame(() => {
          zoomToNodeInput('root');
        });
      });

      textarea.addEventListener('blur', () => {
        if (state.zoomTargetNodeId === 'root') {
          state.zoomTargetNodeId = null;
        }
        scheduleZoomOutIfIdle();
      });

      textarea.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
      });
      textarea.addEventListener('mousedown', (event) => {
        event.stopPropagation();
      });
      
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (textarea.value.trim().length > 0) {
              handleSubtopicsInject('root');
            }
        }
      });

      actionRow.appendChild(sendButton);
      inputContainer.appendChild(textarea);
      inputContainer.appendChild(actionRow);
      inputWrap.appendChild(inputContainer);

      container.appendChild(inputWrap);
    }

    return container;
  }

  function buildRecursiveNode(node, allNodes) {
    const container = document.createElement('div');
    container.className = 'rl-tree-node';

    const nodeWrapper = document.createElement('div');
    nodeWrapper.className = 'rl-node-wrapper';
    if (state.selectedNodeId === node.id) nodeWrapper.classList.add('is-expanded');
    nodeWrapper.dataset.nodeId = node.id;

    const children = allNodes.filter((child) => child.parentId === node.id);
    const hasChildren = children.length > 0;
    
    // Add class to wrapper for styling differentiation
    if (hasChildren) {
      nodeWrapper.classList.add('has-children');
    } else {
      nodeWrapper.classList.add('is-leaf');
    }

    const nodeContent = document.createElement('div');
    nodeContent.className = 'rl-node-content';

    const nodeCard = document.createElement('div'); // Changed to div as it's a container now
    nodeCard.className = 'rl-node-card';
    nodeCard.setAttribute('data-node-id', node.id);

    const title = document.createElement('div');
    title.className = 'rl-node-title';
    title.textContent = node.label;
    
    nodeCard.appendChild(title);
    nodeContent.appendChild(nodeCard);

    // Input section - always present but styled differently based on state
    const inputWrap = document.createElement('div');
    inputWrap.className = 'rl-node-input-area';
    
    const inputContainer = document.createElement('div');
    inputContainer.className = 'rl-node-input-container';

    const textarea = document.createElement('textarea');
    textarea.rows = hasChildren ? 1 : 3; // Leaf nodes have taller inputs
    textarea.placeholder = hasChildren ? 'Add more...' : 'Add sub-topics...';
    textarea.dataset.nodeId = node.id;
    textarea.className = 'rl-node-input-field';

    const actionRow = document.createElement('div');
    actionRow.className = 'rl-node-actions';

    const sendButton = document.createElement('button');
    sendButton.className = 'rl-btn-icon hidden';
    sendButton.dataset.action = 'node-send';
    sendButton.dataset.nodeId = node.id;
    sendButton.innerHTML = icons.send;

    sendButton.addEventListener('click', (event) => {
      event.preventDefault();
      handleSubtopicsInject(node.id);
    });

    textarea.addEventListener('input', () => {
      // Auto-expand logic could go here
      sendButton.classList.toggle('hidden', textarea.value.trim().length === 0);
    });

    textarea.addEventListener('focus', () => {
      state.zoomTargetNodeId = node.id;
      state.userHasPanned = false;
      requestAnimationFrame(() => {
        zoomToNodeInput(node.id);
      });
    });

    textarea.addEventListener('blur', () => {
      if (state.zoomTargetNodeId === node.id) {
        state.zoomTargetNodeId = null;
      }
      scheduleZoomOutIfIdle();
    });

    textarea.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
    });
    textarea.addEventListener('mousedown', (event) => {
      event.stopPropagation();
    });

    // Handle Enter key for quick submit
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (textarea.value.trim().length > 0) {
          handleSubtopicsInject(node.id);
        }
      }
    });

    actionRow.appendChild(sendButton);
    inputContainer.appendChild(textarea);
    inputContainer.appendChild(actionRow);
    inputWrap.appendChild(inputContainer);

    nodeContent.appendChild(inputWrap);

    nodeWrapper.appendChild(nodeContent);
    container.appendChild(nodeWrapper);

    if (hasChildren) {
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'rl-tree-children';
      children.forEach((child) => {
        childrenContainer.appendChild(buildRecursiveNode(child, allNodes));
      });
      container.appendChild(childrenContainer);
    }

    return container;
  }

  // 监听 resize 事件重新绘制曲线
  window.addEventListener('resize', () => {
    updateTreeLayout();
    drawTreeCurves();
    if (!state.userHasPanned && !state.zoomTargetNodeId) {
      fitCanvasToTree();
    }
  });

  // 监听侧边栏滚动重新绘制（如果需要，目前 canvas 随 tree 滚动所以不需要实时重绘）
  // 但为了保险，可以在动画结束后重绘
  function toggleSidebar() {
    const next = !state.sidebarCollapsed;
    applySidebarCollapsedState(next, { persist: false });
  }

  function selectNode(nodeId) {
    if (nodeId === 'root') return;
    state.selectedNodeId = nodeId;
    renderTree();

    const node = state.tree?.nodes.find((entry) => entry.id === nodeId);
    if (!node) return;

    const parentNode = state.tree?.nodes.find((entry) => entry.id === node.parentId);
    const parentLabel = parentNode ? parentNode.label : state.tree?.rootTopic || '';

    const now = Date.now();
    if (state.lastInjectedNodeId === nodeId && now - state.lastInjectedAt < 120000) {
      showToast('提示词已插入输入框');
      return;
    }

    const prompt = PROMPTS.getDivePrompt(node.label, parentLabel);
    DOM.injectPrompt(prompt);
    state.lastInjectedNodeId = nodeId;
    state.lastInjectedAt = now;
    showToast(`Curating: ${node.label}`);
  }

  function updateSelectedInfo() {
    // UI no longer has selected node panel; keep for compatibility.
  }

  function getSelectedNode() {
    if (!state.tree || !state.selectedNodeId) return null;
    return state.tree.nodes.find((node) => node.id === state.selectedNodeId) || null;
  }

  function updateRootSentState(isSent) {
    const wasSent = state.rootSent;
    state.rootSent = isSent;
    const treeRoot = document.getElementById(selectors.tree);
    if (!treeRoot) return;

    const rootInput = treeRoot.querySelector('.rl-node-root');
    if (rootInput) {
      rootInput.classList.toggle('is-sent', isSent);
    }

    const rootWrapper = treeRoot.querySelector('.rl-node-root-wrapper');
    if (rootWrapper) {
      rootWrapper.classList.toggle('is-sent', isSent);
    }

    if (isSent && !wasSent) {
      showToast('可以开始拆解子主题');
    }
  }

  async function updateSettings(newSettings) {
    try {
      await STORAGE.updateSettings(newSettings);
    } catch (error) {
      console.error('[Recursive-Learn] Error updating settings:', error);
    }
  }

  function showToast(message, duration = 2500) {
    const toast = document.getElementById(selectors.toast);
    if (!toast) return;
    
    const messageEl = toast.querySelector('.rl-toast-message');
    if (messageEl) {
      messageEl.textContent = message;
    }
    
    // Clear any existing timeout
    if (toast.hideTimeout) {
      clearTimeout(toast.hideTimeout);
    }
    
    toast.classList.add('show');
    
    toast.hideTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  function syncSettingsUI() {
    const settingsPanel = document.getElementById(selectors.settingsPanel);
    if (!settingsPanel) return;
    const checkbox = settingsPanel.querySelector('input[data-setting="sidebarCollapsed"]');
    if (!checkbox) return;
    checkbox.checked = state.sidebarDefaultCollapsed;
    if (checkbox.dataset.bound === 'true') return;
    checkbox.dataset.bound = 'true';
    checkbox.addEventListener('change', async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      state.sidebarDefaultCollapsed = target.checked;
      await updateSettings({ sidebarCollapsed: target.checked });
      showToast(target.checked ? '已设为默认收起' : '已设为默认展开');
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggleSidebar') {
      toggleSidebar();
      sendResponse({ success: true, collapsed: state.sidebarCollapsed });
    }
    return true;
  });

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  // Retry initialization on late-loading UIs (Claude/Gemini SPA)
  const retryIntervals = [800, 1600, 3200, 6400];
  retryIntervals.forEach((delay) => {
    setTimeout(() => {
      if (state.initialized) return;
      initialize();
    }, delay);
  });
})();
