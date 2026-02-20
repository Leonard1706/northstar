import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

// Base data directory
export const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure directory exists
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch {
    // Directory might already exist
  }
}

// Ensure base data directories exist (called lazily on first use)
let _dataBootstrapped = false;
export async function ensureDataDir(): Promise<void> {
  if (_dataBootstrapped) return;
  _dataBootstrapped = true;
  await ensureDir(DATA_DIR);
  await ensureDir(path.join(DATA_DIR, 'goals'));
  await ensureDir(path.join(DATA_DIR, 'reflections'));
  await ensureDir(path.join(DATA_DIR, 'vision'));
}

// Read a markdown file with frontmatter
export async function readMarkdownFile<T>(filePath: string): Promise<{ frontmatter: T; content: string } | null> {
  try {
    await ensureDataDir();
    const fullPath = path.join(DATA_DIR, filePath);
    const fileContent = await fs.readFile(fullPath, 'utf-8');
    const { data, content } = matter(fileContent);
    return { frontmatter: data as T, content: content.trim() };
  } catch {
    return null;
  }
}

// Write a markdown file with frontmatter
export async function writeMarkdownFile<T extends Record<string, unknown>>(
  filePath: string,
  frontmatter: T,
  content: string
): Promise<boolean> {
  try {
    await ensureDataDir();
    const fullPath = path.join(DATA_DIR, filePath);
    await ensureDir(path.dirname(fullPath));

    const fileContent = matter.stringify(content, frontmatter);
    await fs.writeFile(fullPath, fileContent, 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing file:', error);
    return false;
  }
}

// List all markdown files in a directory (recursive)
export async function listMarkdownFiles(dirPath: string): Promise<string[]> {
  await ensureDataDir();
  const files: string[] = [];

  async function walk(currentPath: string) {
    try {
      const fullPath = path.join(DATA_DIR, currentPath);
      const entries = await fs.readdir(fullPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          await walk(entryPath);
        } else if (entry.name.endsWith('.md')) {
          files.push(entryPath);
        }
      }
    } catch {
      // Directory might not exist
    }
  }

  await walk(dirPath);
  return files;
}

// Check if file exists
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const fullPath = path.join(DATA_DIR, filePath);
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

// Delete a file
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    const fullPath = path.join(DATA_DIR, filePath);
    await fs.unlink(fullPath);
    return true;
  } catch {
    return false;
  }
}

// Get file stats
export async function getFileStats(filePath: string): Promise<{ created: Date; modified: Date } | null> {
  try {
    const fullPath = path.join(DATA_DIR, filePath);
    const stats = await fs.stat(fullPath);
    return {
      created: stats.birthtime,
      modified: stats.mtime,
    };
  } catch {
    return null;
  }
}
