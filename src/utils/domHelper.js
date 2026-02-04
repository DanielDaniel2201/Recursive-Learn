/**
 * DOM Helper utility for interacting with AI chat platforms
 * Provides selectors and methods for different platforms
 */

const DOMHelper = {
  /**
   * Platform-specific selectors
   */
  SELECTORS: {
    chatgpt: {
      conversationContainer: ['main', '[data-testid="conversation"]'],
      assistantMessage: ['[data-message-author-role="assistant"]'],
      inputTextarea: ['#prompt-textarea', 'div#prompt-textarea'],
      sendButton: ['[data-testid="send-button"]', 'button[aria-label="Send prompt"]'],
      messageContainer: ['[data-testid^="conversation-turn-"]']
    },
    claude: {
      conversationContainer: ['main', 'div[role="main"]', '.conversation-container'],
      assistantMessage: ['[data-testid="message-content"]', '.message-content', '.assistant-message'],
      inputTextarea: ['.ProseMirror', 'div[contenteditable="true"]', 'div[role="textbox"]'],
      sendButton: ['button[aria-label="Send Message"]', 'button[aria-label="Send message"]', 'button[type="submit"]'],
      messageContainer: ['.message-container', '[data-testid="message"]']
    },
    gemini: {
      conversationContainer: ['main', 'div[role="main"]', '.conversation-container'],
      assistantMessage: ['.model-response', '.response-container', 'div[role="article"]'],
      inputTextarea: ['.ql-editor', 'div[contenteditable="true"]', 'div[role="textbox"]'],
      sendButton: ['button.send-button', 'button[aria-label="Send message"]', 'button[aria-label="Send"]'],
      messageContainer: ['.message-content', 'div[role="article"]']
    }
  },

  /**
   * Detect current platform based on URL
   * @returns {string} - 'chatgpt', 'claude', 'gemini', or 'unknown'
   */
  detectPlatform() {
    const url = window.location.href;
    if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) {
      return 'chatgpt';
    } else if (url.includes('claude.ai')) {
      return 'claude';
    } else if (url.includes('gemini.google.com')) {
      return 'gemini';
    }
    return 'unknown';
  },

  /**
   * Get selectors for current platform
   * @returns {Object}
   */
  getSelectors() {
    const platform = this.detectPlatform();
    return this.SELECTORS[platform] || this.SELECTORS.chatgpt;
  },

  toSelectorList(selectors) {
    if (Array.isArray(selectors)) return selectors;
    return selectors ? [selectors] : [];
  },

  queryFirst(selectors) {
    const list = this.toSelectorList(selectors);
    for (const selector of list) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  },

  queryAll(selectors) {
    const list = this.toSelectorList(selectors);
    const nodes = [];
    const seen = new Set();
    list.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        if (!seen.has(node)) {
          seen.add(node);
          nodes.push(node);
        }
      });
    });
    return nodes;
  },

  matchesAny(element, selectors) {
    if (!element) return false;
    const list = this.toSelectorList(selectors);
    return list.some((selector) => element.matches?.(selector));
  },

  /**
   * Get the input textarea element
   * @returns {HTMLElement|null}
   */
  getInputTextarea() {
    const selectors = this.getSelectors();
    return this.queryFirst(selectors.inputTextarea);
  },

  /**
   * Get the send button element
   * @returns {HTMLElement|null}
   */
  getSendButton() {
    const selectors = this.getSelectors();
    return this.queryFirst(selectors.sendButton);
  },

  /**
   * Get all assistant messages
   * @returns {NodeList}
   */
  getAssistantMessages() {
    const selectors = this.getSelectors();
    return this.queryAll(selectors.assistantMessage);
  },

  /**
   * Get the last assistant message
   * @returns {HTMLElement|null}
   */
  getLastAssistantMessage() {
    const messages = this.getAssistantMessages();
    return messages.length > 0 ? messages[messages.length - 1] : null;
  },

  /**
   * Inject text into the input textarea
   * @param {string} text - Text to inject
   * @returns {boolean} - Success status
   */
  injectPrompt(text) {
    const platform = this.detectPlatform();
    const textarea = this.getInputTextarea();
    
    if (!textarea) {
      console.error('[Recursive-Learn] Input textarea not found');
      return false;
    }

    const isContentEditable = textarea.isContentEditable || textarea.getAttribute('contenteditable') === 'true';

    if (platform === 'chatgpt') {
      const p = textarea.querySelector('p') || textarea;
      p.innerHTML = text.replace(/\n/g, '<br>');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (platform === 'claude' || platform === 'gemini') {
      if (isContentEditable) {
        const html = `<p>${text.replace(/\n/g, '</p><p>')}</p>`;
        textarea.innerHTML = html;
      } else {
        textarea.value = text;
      }
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      if (isContentEditable) {
        textarea.textContent = text;
      } else {
        textarea.value = text;
      }
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Focus the textarea
    textarea.focus();
    
    return true;
  },

  /**
   * Get text content from the last assistant message
   * @returns {string}
   */
  getLastAssistantMessageText() {
    const message = this.getLastAssistantMessage();
    if (!message) return '';
    return message.textContent || message.innerText || '';
  },

  /**
   * Create a MutationObserver to watch for new messages
   * @param {Function} callback - Callback when new message is detected
   * @returns {MutationObserver}
   */
  createMessageObserver(callback) {
    const selectors = this.getSelectors();
    const container = this.queryFirst(selectors.conversationContainer) || document.body;
    if (!container) {
      console.error('[Recursive-Learn] Conversation container not found');
      return null;
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if the added nodes contain assistant messages
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
               const assistantMsg = node.querySelector?.(this.toSelectorList(selectors.assistantMessage)[0]) ||
                                    (this.matchesAny(node, selectors.assistantMessage) ? node : null);
              if (assistantMsg) {
                // Wait a bit for the message to fully render
                setTimeout(() => callback(assistantMsg), 500);
              }
            }
          });
        }
        
        // Also check for text changes in existing messages (streaming)
        if (mutation.type === 'characterData' || mutation.type === 'childList') {
          // Debounce streaming updates
          clearTimeout(this._streamingTimeout);
          this._streamingTimeout = setTimeout(() => {
            const lastMsg = this.getLastAssistantMessage();
            if (lastMsg) {
              callback(lastMsg);
            }
          }, 1000);
        }
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true
    });

    return observer;
  },

  /**
   * Get current conversation URL
   * @returns {string}
   */
  getConversationUrl() {
    return window.location.href;
  },

  /**
   * Check if we're on a new/empty conversation
   * @returns {boolean}
   */
  isNewConversation() {
    const messages = this.getAssistantMessages();
    return messages.length === 0;
  }
};

// Export for module systems or make globally available
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DOMHelper;
} else {
  window.RecursiveLearnDOMHelper = DOMHelper;
}
