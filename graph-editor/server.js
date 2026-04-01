const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const fs = require('fs');
const express = require('express');
const cors = require('cors');
const yaml = require('js-yaml');

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

const PIPELINES_DIR = '/pipelines';

app.get('/api/pipelines', (req, res) => {
  let entries;
  try {
    entries = fs.readdirSync(PIPELINES_DIR);
  } catch {
    return res.json({ pipelines: [] });
  }
  const pipelines = entries
    .filter((name) => name.endsWith('.yaml'))
    .map((name) => name.replace(/\.yaml$/, ''))
    .sort((a, b) => a.localeCompare(b));
  res.json({ pipelines });
});

app.post('/api/pipelines', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
  const safeName = name.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = path.join(PIPELINES_DIR, safeName + '.yaml');
  if (fs.existsSync(filePath)) return res.status(409).json({ error: 'pipeline already exists' });
  try {
    fs.writeFileSync(filePath, '', 'utf-8');
  } catch (err) {
    return res.status(500).json({ error: 'could not create pipeline' });
  }
  res.json({ name: safeName });
});

app.delete('/api/pipelines/:name', (req, res) => {
  const safeName = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = path.join(PIPELINES_DIR, safeName + '.yaml');
  try {
    fs.unlinkSync(filePath);
  } catch {
    return res.status(404).json({ error: 'pipeline not found' });
  }
  res.json({ ok: true });
});

app.get('/api/pipelines/:name/config', (req, res) => {
  const safeName = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = path.join(PIPELINES_DIR, safeName + '.yaml');
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return res.status(404).json({ error: 'pipeline not found' });
  }
  if (!content.trim()) {
    return res.json({ config: null });
  }
  let parsed;
  try {
    parsed = yaml.load(content);
  } catch {
    return res.status(422).json({ error: 'invalid_yaml' });
  }
  res.json({ config: parsed });
});

app.put('/api/pipelines/:name/config', (req, res) => {
  const safeName = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = path.join(PIPELINES_DIR, safeName + '.yaml');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'pipeline not found' });
  }
  try {
    const content = yaml.dump(req.body.config, { noRefs: true, lineWidth: -1 });
    fs.writeFileSync(filePath, content, 'utf-8');
  } catch (err) {
    return res.status(500).json({ error: 'could not save config' });
  }
  res.json({ ok: true });
});

const PHP_SRC_DIR = '/php-src';

app.get('/api/stage-classes', (req, res) => {
  const stageDir = path.join(PHP_SRC_DIR, 'Stage');
  let entries;
  try {
    entries = fs.readdirSync(stageDir);
  } catch {
    return res.json({ stages: [], conditions: [] });
  }

  const stages = [];
  const conditions = [];

  for (const name of entries) {
    if (!name.endsWith('.php')) continue;
    const filePath = path.join(stageDir, name);
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }
    const classMatch = content.match(/class\s+(\w+)\s+extends\s+(\w+)/);
    if (!classMatch) continue;
    const className = classMatch[1];
    const parentClass = classMatch[2];
    if (parentClass === 'AbstractStage') {
      stages.push(className);
    } else if (parentClass === 'AbstractCondition') {
      conditions.push(className);
    }
  }

  stages.sort((a, b) => a.localeCompare(b));
  conditions.sort((a, b) => a.localeCompare(b));
  res.json({ stages, conditions });
});

const EXCLUDED = new Set([
  'node_modules', '.git', '.next', 'dist', 'build',
  '__pycache__', '.venv', '.env', '.cache', '.DS_Store',
  'vendor', 'var'
]);

function walkDir(dirPath) {
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const items = entries
    .filter((e) => !EXCLUDED.has(e.name))
    .map((e) => {
      const fullPath = path.join(dirPath, e.name);
      if (e.isDirectory()) {
        return { name: e.name, path: fullPath, type: 'directory', children: walkDir(fullPath) };
      }
      return { name: e.name, path: fullPath, type: 'file' };
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  return items;
}

function filterTree(nodes, search) {
  const q = search.toLowerCase();
  const result = [];

  for (const node of nodes) {
    const nameMatches = node.name.toLowerCase().includes(q);

    if (node.type === 'file') {
      if (nameMatches) result.push(node);
    } else {
      // Directory: if name matches, include entire subtree
      if (nameMatches) {
        result.push(node);
      } else {
        // Otherwise, recurse into children and include dir only if descendants match
        const filtered = filterTree(node.children || [], search);
        if (filtered.length > 0) {
          result.push({ ...node, children: filtered });
        }
      }
    }
  }

  return result;
}

app.get('/api/files', (req, res) => {
  const dirPath = req.query.path;
  const search = (req.query.search || '').trim();
  if (!dirPath) return res.status(400).json({ error: 'path query param required' });

  try {
    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) return res.status(400).json({ error: 'path is not a directory' });
  } catch {
    return res.status(404).json({ error: 'directory not found' });
  }

  let tree = walkDir(dirPath);
  if (search) tree = filterTree(tree, search);
  res.json({ tree });
});

const EXT_TO_LANG = {
  '.js': 'js', '.jsx': 'js', '.ts': 'js', '.tsx': 'js', '.mjs': 'js',
  '.php': 'php',
  '.c': 'c', '.h': 'c', '.cpp': 'c', '.hpp': 'c', '.cc': 'c', '.cxx': 'c',
  '.cs': 'cs',
  '.rs': 'rs',
  '.go': 'go',
};

const FUNCTION_PATTERNS = {
  js: [
    /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
    /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?\(/g,
    /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?function/g,
    /^\s+(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/gm,
  ],
  php: [
    /function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
  ],
  c: [
    /^(?!.*\b(?:if|else|while|for|switch|return|sizeof|typeof)\b)[a-zA-Z_][\w\s\*]*\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm,
  ],
  cs: [
    /(?:public|private|protected|internal|static|async|override|virtual|abstract)[\s\S]*?\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
  ],
  rs: [
    /fn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[<(]/g,
  ],
  go: [
    /func\s+(?:\([^)]*\)\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
  ],
};

function extractFunctions(content, lang) {
  const patterns = FUNCTION_PATTERNS[lang];
  if (!patterns) return [];
  const names = new Set();
  for (const regex of patterns) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      names.add(match[1] + '()');
    }
  }
  return [...names];
}

app.get('/api/functions', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'path query param required' });

  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return res.status(400).json({ error: 'path is not a file' });
  } catch {
    return res.status(404).json({ error: 'file not found' });
  }

  const ext = path.extname(filePath).toLowerCase();
  const lang = EXT_TO_LANG[ext];
  if (!lang) return res.json({ functions: [] });

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return res.status(500).json({ error: 'could not read file' });
  }

  const functions = extractFunctions(content, lang);
  res.json({ functions });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
