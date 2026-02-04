# Recursive-Learn Chrome Extension

> 🌳 Visualize your learning journey with AI as a structured knowledge tree.

**Recursive-Learn** is a Chrome extension that transforms your linear AI conversations (ChatGPT, Claude, Gemini) into structured knowledge trees. It keeps you focused, visualizes your progress, and stores everything locally.

![Recursive-Learn Preview](assets/preview.png)

## 📦 Installation (For Users)

You can use this extension immediately without installing Node.js or running any build commands.

1.  **Download the Code**
    *   Click the green **Code** button above and select **Download ZIP**.
    *   Extract the ZIP file to a folder on your computer.

2.  **Load into Chrome**
    *   Open Chrome and go to `chrome://extensions/` (or click the puzzle piece icon -> Manage Extensions).
    *   Toggle **Developer mode** in the top-right corner.
    *   Click **Load unpacked** (top-left).
    *   Select the folder where you extracted the code.

3.  **Start Learning**
    *   **Tip**: Click the puzzle piece icon in Chrome toolbar and **Pin** Recursive-Learn. Click the extension icon to toggle the sidebar.
    *   Visit [ChatGPT](https://chatgpt.com), [Claude](https://claude.ai), or [Gemini](https://gemini.google.com).
    *   The Recursive-Learn sidebar will appear on the right.
    *   Enter a topic (e.g., "React Hooks") and click "Start Learning".

## 🛠️ Development (For Developers)

If you want to modify the code or styles:

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Build CSS**
    The project uses Tailwind CSS. The CSS file (`src/content/content.css`) is included in the repo, but if you modify `src/content/tailwind.css`, you must rebuild it:
    
    *   **One-off build:**
        ```bash
        npm run build:css
        ```
    *   **Watch mode (auto-rebuild on change):**
        ```bash
        npm run watch:css
        ```

3.  **Reload Extension**
    After making changes to JS or CSS files, go back to `chrome://extensions/` and click the **Refresh** (circular arrow) icon on the Recursive-Learn card.

## 🔒 Data & Privacy

*   **Local Storage**: All your learning trees and data are stored locally in your browser (`chrome.storage.local`).
*   **No Cloud Sync**: No data is sent to any external server (other than the AI platform you are conversing with).
*   **Safety**: Deleting the extension will remove your local data.

## 📄 Documentation

*   See [Step 3](#3-start-learning) for quick usage instructions.

