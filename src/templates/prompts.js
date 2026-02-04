/**
 * Prompt templates for Recursive-Learn
 * These templates are injected into the AI chat input
 */

const PromptTemplates = {
  /**
   * Initial learning prompt template
   * Used when starting a new learning tree
   * @param {string} topic - The root topic to learn
   * @returns {string}
   */
  getInitPrompt(topic) {
    return `我想系统性地学习「${topic}」。

请帮我解释这个概念的核心内容，包括：
- 它是什么
- 为什么要用它
- 核心要点`;
  },

  /**
   * Dive deeper prompt template
   * Used when user wants to learn more about a subtopic
   * @param {string} topic - The subtopic to dive into
   * @param {string} parent - The parent topic
   * @returns {string}
   */
  getDivePrompt(topic, parent) {
    return `关于「${parent}」，我想深入了解「${topic}」。

请详细解释这个概念，帮助我理解它的用法和原理。`;
  },

  /**
   * Multi-subtopic prompt template
   * @param {string[]} topics - List of subtopics
   * @param {string} parent - The parent topic
   * @returns {string}
   */
  getMultiDivePrompt(topics, parent) {
    const list = topics.map((topic) => `- ${topic}`).join('\n');
    return `关于「${parent}」，请为我拆解以下子主题，每行一个子主题详细解释：

${list}`;
  },

  /**
   * Explain understanding prompt template
   * Used when user wants to verify their understanding
   * @param {string} topic - The topic to explain understanding about
   * @returns {string}
   */
  getExplainPrompt(topic) {
    return `让我解释一下我对「${topic}」的理解：

[在这里写下你的理解]

请检查我的理解是否正确，指出任何错误或遗漏的地方。`;
  },


  /**
   * Get prompt template by type
   * @param {string} type - 'init', 'dive', or 'explain'
   * @param {Object} params - Parameters for the template
   * @returns {string}
   */
  getPrompt(type, params) {
    switch (type) {
      case 'init':
        return this.getInitPrompt(params.topic);
      case 'dive':
        return this.getDivePrompt(params.topic, params.parent);
      case 'multi-dive':
        return this.getMultiDivePrompt(params.topics, params.parent);
      case 'explain':
        return this.getExplainPrompt(params.topic);
      default:
        return '';
    }
  }
};

// Export for module systems or make globally available
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PromptTemplates;
} else {
  window.RecursiveLearnPrompts = PromptTemplates;
}
