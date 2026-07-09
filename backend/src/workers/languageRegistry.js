/**
 * Language registry — single source of truth for every language
 * the judge supports. Each entry defines:
 *
 *   image          Docker image to run (pinned tag for reproducibility)
 *   filename       File the code is written to inside the container
 *   compileCmd     Shell command to compile (null = interpreted)
 *   runCmd         Shell command to execute
 *   compileTimeout Max ms allowed for compilation step
 *   extensions     File extensions associated with this language (for display)
 *   monacoLang     Monaco Editor language identifier
 *   version        Human-readable version string shown in the UI
 */

export const LANGUAGE_REGISTRY = {
  python: {
    image:          "python:3.12-alpine",
    filename:       "solution.py",
    compileCmd:     null,
    runCmd:         "python3 -u solution.py",   // -u = unbuffered stdout
    compileTimeout: 0,
    extensions:     [".py"],
    monacoLang:     "python",
    version:        "Python 3.12",
    pullPriority:   1,                          // pull order on startup
  },

  javascript: {
    image:          "node:20-alpine",
    filename:       "solution.js",
    compileCmd:     null,
    runCmd:         "node --max-old-space-size=128 solution.js",
    compileTimeout: 0,
    extensions:     [".js"],
    monacoLang:     "javascript",
    version:        "Node.js 20 LTS",
    pullPriority:   2,
  },

  java: {
    image:          "eclipse-temurin:21-jdk-alpine",
    filename:       "Solution.java",
    compileCmd:     "javac Solution.java",
    runCmd:         "java -Xmx128m -Xms16m Solution",
    compileTimeout: 20_000,
    extensions:     [".java"],
    monacoLang:     "java",
    version:        "Java 21 (Temurin)",
    pullPriority:   4,
  },

  cpp: {
    image:          "gcc:13.2",
    filename:       "solution.cpp",
    compileCmd:     "g++ -O2 -std=c++17 -o solution solution.cpp -lm",
    runCmd:         "./solution",
    compileTimeout: 20_000,
    extensions:     [".cpp", ".cc"],
    monacoLang:     "cpp",
    version:        "GCC 13.2 C++17",
    pullPriority:   3,
  },

  go: {
    image:          "golang:1.22-alpine",
    filename:       "solution.go",
    compileCmd:     null,
    runCmd:         "go run solution.go",
    compileTimeout: 0,
    extensions:     [".go"],
    monacoLang:     "go",
    version:        "Go 1.22",
    pullPriority:   5,
  },

  rust: {
    image:          "rust:1.78-alpine",
    filename:       "solution.rs",
    compileCmd:     "rustc -O -o solution solution.rs",
    runCmd:         "./solution",
    compileTimeout: 30_000,   // Rust compile is slow
    extensions:     [".rs"],
    monacoLang:     "rust",
    version:        "Rust 1.78",
    pullPriority:   6,
  },
};

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_REGISTRY);

export function getLangConfig(language) {
  const cfg = LANGUAGE_REGISTRY[language];
  if (!cfg) throw new Error(`Unsupported language: ${language}`);
  return cfg;
}

// Sorted by pull priority for the image prefetch script
export const LANGUAGES_BY_PULL_PRIORITY = Object.entries(LANGUAGE_REGISTRY)
  .sort(([, a], [, b]) => a.pullPriority - b.pullPriority)
  .map(([lang, cfg]) => ({ lang, ...cfg }));
