// 1. LANGUAGE CONFIGURATION & TEMPLATES
const templates = {
  cpp: `// Write your C++ code here...
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`,
  java: `// Write your Java code here...
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
  python: `# Write your Python code here...
print("Hello, World!")`,
};

const modes = {
  cpp: "text/x-c++src",
  java: "text/x-java",
  python: "text/x-python",
};

// 2. INITIALIZE CODEMIRROR EDITOR
const editor = CodeMirror.fromTextArea(document.getElementById("code"), {
  lineNumbers: true,
  theme: "dracula",
  mode: modes.cpp,
  tabSize: 2,
  indentUnit: 2,
  matchBrackets: true,
});

// Set initial template
editor.setValue(templates.cpp);

const backendURL =
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1") &&
    window.location.port !== "5000"
    ? "http://localhost:5000"
    : "";


// 3. LANGUAGE SWITCHER & TAB SYNC
const fileMeta = {
  cpp: { name: "main.cpp", icon: "bi-filetype-cpp", label: "C++" },
  java: { name: "Main.java", icon: "bi-filetype-java", label: "Java" },
  python: { name: "main.py", icon: "bi-filetype-py", label: "Python" },
};

const languageSelect = document.getElementById("language");
languageSelect.addEventListener("change", () => {
  const lang = languageSelect.value;
  editor.setOption("mode", modes[lang]);
  editor.setValue(templates[lang] || "");

  // Update tab indicator
  const tabName = document.getElementById("tabName");
  const tabIcon = document.getElementById("tabIcon");
  const fileInfo = document.getElementById("fileInfo");
  if (fileMeta[lang]) {
    if (tabName) tabName.textContent = fileMeta[lang].name;
    if (tabIcon) tabIcon.className = `bi ${fileMeta[lang].icon}`;
    if (fileInfo) fileInfo.textContent = `UTF-8 | ${fileMeta[lang].label}`;
  }
});

// 4. RUN CODE (EXECUTION LOGIC)
const runBtn = document.getElementById("runBtn") || document.querySelector(".btn.run");
const loading = document.getElementById("loading");
const output = document.getElementById("output");

async function runCode() {
  const code = editor.getValue();
  const language = languageSelect.value;
  const input = document.getElementById("input").value;

  // Show loading spinner
  if (loading) loading.classList.add("active");

  try {
    const response = await fetch(`${backendURL}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, code, input }),
    });

    const result = await response.json();

    // Display output (prioritizing stdout, then stderr / error messages)
    const resultText =
      result.stdout?.trim() ||
      result.stderr?.trim() ||
      result.compile_output?.trim() ||
      result.message ||
      result.error ||
      "No output";

    output.textContent = resultText;

    // Update execution status panel if present
    const badgeText = document.getElementById("resultBadgeText");
    const resTime = document.getElementById("resTime");
    if (badgeText) badgeText.textContent = result.stderr ? "Error" : "Accepted";
    if (resTime) resTime.textContent = result.time ? `${result.time}s` : "--";
  } catch (error) {
    output.textContent = "Error connecting to server!";
    console.error("Execution error:", error);
  } finally {
    // Hide loading spinner
    if (loading) loading.classList.remove("active");
  }
}

if (runBtn) runBtn.addEventListener("click", runCode);

// Keyboard shortcut: Ctrl + Enter to run code
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    runCode();
  }
});
// 5. HELPER BUTTONS (Input Clear & Output Copy)
// Clear custom input
const inputClearBtn = document.getElementById("inputClearBtn");
if (inputClearBtn) {
  inputClearBtn.addEventListener("click", () => {
    document.getElementById("input").value = "";
  });
}

// Copy output to clipboard
function copyOutput() {
  navigator.clipboard.writeText(output.textContent || "");
}

const copyBtn = document.getElementById("copyBtn");
if (copyBtn) copyBtn.addEventListener("click", copyOutput);

const copyOutputBtn = document.getElementById("copyOutputBtn");
if (copyOutputBtn) copyOutputBtn.addEventListener("click", copyOutput);
