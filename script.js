const defaultTemplates = {
  cpp: `// Write your code here...
#include <bits/stdc++.h>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`,
  java: `// Write your code here...
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
  python: `# Write your code here...
print("Hello, World!")`,
};

const cmModes = {
  cpp: "text/x-c++src",
  java: "text/x-java",
  python: "text/x-python",
};

const fileExtensions = { cpp: "cpp", java: "java", python: "py" };
const languageLabels = { cpp: "C++", java: "Java", python: "Python" };

// ---- Tabs state ----
// Each tab: { name, language, content }
let tabs = [
  { name: "main.cpp", language: "cpp", content: defaultTemplates.cpp },
];
let activeTabIndex = 0;
let tabCounter = 1;

// Initialize CodeMirror
let editor = CodeMirror.fromTextArea(document.getElementById("code"), {
  lineNumbers: true,
  theme: "dracula",
  mode: cmModes.cpp,
  tabSize: 2,
  indentUnit: 2,
  matchBrackets: true,
});

// Restore autosaved code if present
const AUTO_SAVE_KEY = "codeengine_autosave_v1";
let autoSaveEnabled = true;

function loadAutoSave() {
  try {
    const saved = JSON.parse(localStorage.getItem(AUTO_SAVE_KEY) || "null");
    if (saved && saved.tabs && saved.tabs.length) {
      tabs = saved.tabs;
      activeTabIndex = saved.activeTabIndex || 0;
      tabCounter = saved.tabCounter || tabs.length;
      renderTabs();
      loadTab(activeTabIndex);
    }
  } catch (e) {
    console.warn("Could not restore autosave", e);
  }
}

function saveAutoSave() {
  if (!autoSaveEnabled) return;
  try {
    localStorage.setItem(
      AUTO_SAVE_KEY,
      JSON.stringify({ tabs, activeTabIndex, tabCounter }),
    );
  } catch (e) {
    console.warn("Could not save autosave", e);
  }
}

editor.on("change", () => {
  tabs[activeTabIndex].content = editor.getValue();
  saveAutoSave();
});

editor.on("cursorActivity", () => {
  const cursor = editor.getCursor();
  document.getElementById("cursorInfo").textContent =
    `Ln ${cursor.line + 1}, Col ${cursor.ch + 1}`;
});

// ---- Tabs rendering ----
const tabBar = document.getElementById("tabBar");
const addTabBtn = document.getElementById("addTabBtn");

function renderTabs() {
  // remove existing tab elements (keep the add button)
  [...tabBar.querySelectorAll(".tab")].forEach((el) => el.remove());

  tabs.forEach((tab, index) => {
    const tabEl = document.createElement("div");
    tabEl.className = "tab" + (index === activeTabIndex ? " active" : "");
    tabEl.dataset.index = index;

    const iconClass =
      tab.language === "cpp"
        ? "bi-filetype-cpp"
        : tab.language === "java"
          ? "bi-filetype-java"
          : "bi-filetype-py";

    tabEl.innerHTML = `
      <i class="bi ${iconClass}"></i>
      <span class="tab-name">${tab.name}</span>
      ${tabs.length > 1 ? '<i class="bi bi-x tab-close" title="Close tab"></i>' : ""}
    `;

    tabEl.addEventListener("click", (e) => {
      if (e.target.classList.contains("tab-close")) return;
      switchTab(index);
    });

    const closeBtn = tabEl.querySelector(".tab-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeTab(index);
      });
    }

    tabBar.insertBefore(tabEl, addTabBtn);
  });
}

function switchTab(index) {
  tabs[activeTabIndex].content = editor.getValue();
  activeTabIndex = index;
  loadTab(index);
  renderTabs();
  saveAutoSave();
}

function loadTab(index) {
  const tab = tabs[index];
  editor.setValue(tab.content);
  editor.setOption("mode", cmModes[tab.language]);
  document.getElementById("language").value = tab.language;
  document.getElementById("fileInfo").textContent =
    `UTF-8 | ${languageLabels[tab.language]}`;
}

function closeTab(index) {
  if (tabs.length <= 1) return;
  tabs.splice(index, 1);
  if (activeTabIndex >= tabs.length) activeTabIndex = tabs.length - 1;
  else if (activeTabIndex > index) activeTabIndex -= 1;
  loadTab(activeTabIndex);
  renderTabs();
  saveAutoSave();
}

addTabBtn.addEventListener("click", () => {
  tabs[activeTabIndex].content = editor.getValue();
  tabCounter += 1;
  const newTab = {
    name: `untitled${tabCounter}.cpp`,
    language: "cpp",
    content: defaultTemplates.cpp,
  };
  tabs.push(newTab);
  activeTabIndex = tabs.length - 1;
  loadTab(activeTabIndex);
  renderTabs();
  saveAutoSave();
  showToast("New tab created", "success");
});

renderTabs();
loadAutoSave();

// ---- Language dropdown ----
document.getElementById("language").addEventListener("change", function () {
  const lang = this.value;
  tabs[activeTabIndex].language = lang;
  editor.setOption("mode", cmModes[lang]);
  document.getElementById("fileInfo").textContent =
    `UTF-8 | ${languageLabels[lang]}`;
  renderTabs();
  saveAutoSave();
});

// ---- CodeMirror theme selector ----
const cmThemeOrder = ["dracula", "monokai", "material-darker", "ayu-dark"];
document.getElementById("cmTheme").addEventListener("change", function () {
  editor.setOption("theme", this.value);
});

// ---- Light / Dark mode toggle ----
const lightModeBtn = document.getElementById("lightModeBtn");
const darkModeBtn = document.getElementById("darkModeBtn");

function setPageTheme(mode) {
  document.documentElement.setAttribute(
    "data-theme",
    mode === "light" ? "light" : "dark",
  );
  lightModeBtn.classList.toggle("active", mode === "light");
  darkModeBtn.classList.toggle("active", mode === "dark");
  localStorage.setItem("codeengine_page_theme", mode);
}

lightModeBtn.addEventListener("click", () => setPageTheme("light"));
darkModeBtn.addEventListener("click", () => setPageTheme("dark"));

(function restorePageTheme() {
  const saved = localStorage.getItem("codeengine_page_theme");
  if (saved) setPageTheme(saved);
})();

// ---- Detect backend URL automatically ----
const backendURL =
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1") &&
  window.location.port !== "5000"
    ? "http://localhost:5000"
    : "";

// ---- Download code button ----
document.getElementById("downloadBtn").addEventListener("click", () => {
  const code = editor.getValue();
  const language = document.getElementById("language").value;
  const ext = fileExtensions[language] || "txt";

  const blob = new Blob([code], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `main.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast("Code downloaded successfully!", "success");
});

// ---- Reset code button ----
document.getElementById("clearBtn").addEventListener("click", () => {
  const lang = tabs[activeTabIndex].language;
  editor.setValue(defaultTemplates[lang] || "");
  tabs[activeTabIndex].content = editor.getValue();
  saveAutoSave();
  showToast("Code reset to default", "success");
});

// ---- Input clear ----
document.getElementById("inputClearBtn").addEventListener("click", () => {
  document.getElementById("input").value = "";
});

// ---- Helper: toast ----
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toast-message");
  toastMessage.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove("show"), 2500);
}

// ---- Execution Result panel helpers ----
const resultBadge = document.getElementById("resultBadge");
const resultBadgeText = document.getElementById("resultBadgeText");
const resultFinished = document.getElementById("resultFinished");
const resTime = document.getElementById("resTime");
const resMemory = document.getElementById("resMemory");
const resLanguage = document.getElementById("resLanguage");
const resStatus = document.getElementById("resStatus");

function updateResultPanel({ ok, label, time, memory, language, statusCode }) {
  resultBadge.className =
    "result-badge " + (ok === true ? "ok" : ok === false ? "error" : "");
  resultBadge.querySelector("i").className =
    ok === true
      ? "bi bi-check-circle-fill"
      : ok === false
        ? "bi bi-x-circle-fill"
        : "bi bi-circle";
  resultBadgeText.textContent = label;
  resultFinished.textContent = ok === undefined ? "" : "Finished";
  resTime.textContent = time ?? "--";
  resMemory.textContent = memory ?? "--";
  resLanguage.textContent = language ?? "--";
  resStatus.textContent = statusCode ?? "--";
}

document.getElementById("resultCollapseBtn").addEventListener("click", () => {
  document.getElementById("resultSection").classList.toggle("collapsed");
});

// ---- Run button click ----
document.querySelector(".btn.run").addEventListener("click", runCode);

async function runCode() {
  const code = editor.getValue();
  const language = document.getElementById("language").value;
  const input = document.getElementById("input").value;

  document.getElementById("loading").classList.add("active");

  try {
    const response = await fetch(`${backendURL}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, code, input }),
    });

    const result = await response.json();

    const outputText =
      result.stdout?.trim() ||
      result.stderr?.trim() ||
      result.compile_output?.trim() ||
      result.message ||
      result.error ||
      "⚠️ No output";

    document.getElementById("output").textContent = outputText;

    const hasError = !!(result.stderr || result.compile_output);
    updateResultPanel({
      ok: !hasError,
      label: hasError ? "Error" : "Accepted",
      time: result.time ? `${result.time} sec` : "N/A",
      memory: result.memory ? `${(result.memory / 1024).toFixed(2)} MB` : "N/A",
      language: languageLabels[language] || language,
      statusCode:
        result.status?.id ?? result.statusCode ?? (hasError ? "—" : "200"),
    });
  } catch (err) {
    document.getElementById("output").textContent = "❌ Server error!";
    updateResultPanel({
      ok: false,
      label: "Server error",
      time: "N/A",
      memory: "N/A",
      language: languageLabels[language] || language,
      statusCode: "—",
    });
    console.error("Fetch error:", err);
  } finally {
    document.getElementById("loading").classList.remove("active");
  }
}

// ---- Copy output ----
function copyOutput() {
  const outputEl = document.getElementById("output");
  const text = outputEl.textContent || "";
  navigator.clipboard
    .writeText(text)
    .then(() => showToast("Output copied to clipboard", "success"))
    .catch(() => showToast("Could not copy output", "error"));
}

document.getElementById("copyBtn").addEventListener("click", copyOutput);
document.getElementById("copyOutputBtn").addEventListener("click", copyOutput);

// ---- Download output ----
document.getElementById("downloadOutputBtn").addEventListener("click", () => {
  const text = document.getElementById("output").textContent || "";
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "output.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Output downloaded", "success");
});

// ---- Clear all ----
document.getElementById("clearAllBtn").addEventListener("click", () => {
  const lang = tabs[activeTabIndex].language;
  editor.setValue(defaultTemplates[lang] || "");
  tabs[activeTabIndex].content = editor.getValue();
  document.getElementById("input").value = "";
  document.getElementById("output").innerHTML =
    '<span class="placeholder">Your output will appear here...</span>';
  updateResultPanel({
    ok: undefined,
    label: "Not run yet",
    time: "--",
    memory: "--",
    language: "--",
    statusCode: "--",
  });
  saveAutoSave();
  showToast("Everything cleared", "success");
});

// ---- Auto save toggle ----
const autoSaveBtn = document.getElementById("autoSaveBtn");
const autoSaveState = document.getElementById("autoSaveState");

autoSaveBtn.addEventListener("click", () => {
  autoSaveEnabled = !autoSaveEnabled;
  autoSaveState.textContent = autoSaveEnabled ? "ON" : "OFF";
  if (autoSaveEnabled) {
    saveAutoSave();
    showToast("Auto save turned on", "success");
  } else {
    showToast("Auto save turned off", "success");
  }
});

// ---- Theme pill button (cycles editor theme) ----
document.getElementById("themeBtn").addEventListener("click", () => {
  const select = document.getElementById("cmTheme");
  const currentIndex = cmThemeOrder.indexOf(select.value);
  const nextIndex = (currentIndex + 1) % cmThemeOrder.length;
  select.value = cmThemeOrder[nextIndex];
  editor.setOption("theme", cmThemeOrder[nextIndex]);
  showToast(`Editor theme: ${cmThemeOrder[nextIndex]}`, "success");
});

// ---- Shortcuts modal ----
const shortcutsModal = document.getElementById("shortcutsModal");
document.getElementById("shortcutsBtn").addEventListener("click", () => {
  shortcutsModal.classList.add("active");
});
document.getElementById("shortcutsCloseBtn").addEventListener("click", () => {
  shortcutsModal.classList.remove("active");
});
shortcutsModal.addEventListener("click", (e) => {
  if (e.target === shortcutsModal) shortcutsModal.classList.remove("active");
});

// ---- Global keyboard shortcuts ----
document.addEventListener("keydown", (e) => {
  const ctrl = e.ctrlKey || e.metaKey;

  if (ctrl && e.key === "Enter") {
    e.preventDefault();
    runCode();
  } else if (ctrl && e.altKey && e.key.toLowerCase() === "r") {
    e.preventDefault();
    document.getElementById("clearBtn").click();
  } else if (ctrl && e.key.toLowerCase() === "t") {
    e.preventDefault();
    addTabBtn.click();
  } else if (ctrl && e.key.toLowerCase() === "j") {
    e.preventDefault();
    const current = document.documentElement.getAttribute("data-theme");
    setPageTheme(current === "light" ? "dark" : "light");
  }
});
