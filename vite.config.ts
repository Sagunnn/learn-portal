import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";
import { relative, sep } from "node:path";
// @ts-expect-error plain .mjs helper shared with the CLI validator
import { listLessonFiles, validateAll, LESSONS_DIR, CONTENT_DIR } from "./scripts/validate-content.mjs";

/**
 * `virtual:lesson-index` — the metadata of every lesson (title, subject,
 * counts) without the lesson bodies. The dashboard imports this, and each
 * lesson body is lazy-loaded as its own chunk, so the first page stays small
 * no matter how many chapters get added.
 */
function lessonIndex(): Plugin {
  const VIRTUAL = "virtual:lesson-index";
  const RESOLVED = "\0" + VIRTUAL;

  const reportProblems = (server?: ViteDevServer) => {
    const { errors } = validateAll() as { errors: string[] };
    if (errors.length) {
      const msg = `\n[content] ${errors.length} problem(s):\n  ${errors.join("\n  ")}\n`;
      server ? server.config.logger.warn(msg) : console.warn(msg);
    }
  };

  return {
    name: "lesson-index",
    resolveId(id) {
      if (id === VIRTUAL) return RESOLVED;
    },
    load(id) {
      if (id !== RESOLVED) return;
      const entries = [];
      for (const file of listLessonFiles() as string[]) {
        this.addWatchFile(file);
        let lesson;
        try {
          lesson = JSON.parse(readFileSync(file, "utf8"));
        } catch {
          continue; // reported by the validator
        }
        if (!lesson?.meta?.id || lesson.meta.draft) continue;
        entries.push({
          // Same key format as import.meta.glob("/content/lessons/**/*.json")
          path: "/content/lessons/" + relative(LESSONS_DIR, file).split(sep).join("/"),
          meta: lesson.meta,
          counts: {
            chunks: lesson.chunks?.length ?? 0,
            flashcards: lesson.flashcards?.length ?? 0,
            questions: lesson.quiz?.questions?.length ?? 0,
          },
          passPercent: lesson.quiz?.passPercent ?? 70,
        });
      }
      return `export default ${JSON.stringify(entries)};`;
    },
    buildStart() {
      reportProblems();
    },
    configureServer(server) {
      const onChange = (file: string) => {
        if (!file.startsWith(CONTENT_DIR)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) server.moduleGraph.invalidateModule(mod);
        reportProblems(server);
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.add(CONTENT_DIR);
      server.watcher.on("add", onChange);
      server.watcher.on("unlink", onChange);
      server.watcher.on("change", onChange);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), lessonIndex()],
  base: "/",
  build: {
    rolldownOptions: {
      output: {
        // Separate long-lived vendor chunks so a content update doesn't bust their cache.
        codeSplitting: {
          groups: [
            { name: "katex", test: /node_modules[\\/]katex/ },
            { name: "react", test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
});
