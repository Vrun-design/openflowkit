// What a Python import points at: a module file, a package, a namespace folder, stdlib (ignored) or a distribution.
import { dirOf, joinPath } from './paths';
import type { Resolution } from './resolve';
import { isSkippedSource } from './skip';
import type { RawImport, SourceFile } from './types';

const STDLIB = new Set(`__future__ _thread abc aifc argparse array ast asyncio atexit base64 bdb binascii bisect builtins bz2 calendar cgi cgitb chunk
cmath cmd code codecs codeop collections colorsys compileall concurrent configparser contextlib contextvars copy copyreg cProfile csv ctypes curses
dataclasses datetime dbm decimal difflib dis doctest email encodings ensurepip enum errno faulthandler fcntl filecmp fileinput fnmatch fractions ftplib
functools gc getopt getpass gettext glob graphlib grp gzip hashlib heapq hmac html http idlelib imaplib imghdr imp importlib inspect io ipaddress
itertools json keyword lib2to3 linecache locale logging lzma mailbox mailcap marshal math mimetypes mmap modulefinder msvcrt multiprocessing netrc
nntplib nt numbers operator optparse os ossaudiodev pathlib pdb pickle pickletools pipes pkgutil platform plistlib poplib posix posixpath pprint
profile pstats pty pwd py_compile pyclbr pydoc queue quopri random re readline reprlib resource rlcompleter runpy sched secrets select selectors
shelve shlex shutil signal site smtpd smtplib sndhdr socket socketserver spwd sqlite3 ssl stat statistics string stringprep struct subprocess sunau
symtable sys sysconfig syslog tabnanny tarfile telnetlib tempfile termios textwrap threading time timeit tkinter token tokenize tomllib trace
traceback tracemalloc tty turtle types typing unicodedata unittest urllib uu uuid venv warnings wave weakref webbrowser winreg winsound wsgiref
xdrlib xml xmlrpc zipapp zipfile zipimport zlib zoneinfo
distutils asyncore asynchat audioop crypt ntpath opcode sre_compile sre_parse sre_constants __main__ this pydoc_data _collections_abc`.split(/\s+/));

/** Import name → the name it installs under, where they differ; anything else installs as itself. */
const DIST: Record<string, string> = {
  yaml: 'PyYAML', PIL: 'Pillow', cv2: 'opencv-python', sklearn: 'scikit-learn', bs4: 'beautifulsoup4', dateutil: 'python-dateutil',
  jwt: 'PyJWT', attr: 'attrs', dotenv: 'python-dotenv', OpenSSL: 'pyOpenSSL', Crypto: 'pycryptodome', serial: 'pyserial', magic: 'python-magic',
  skimage: 'scikit-image', docx: 'python-docx', git: 'GitPython', jose: 'python-jose', multipart: 'python-multipart', ruamel: 'ruamel.yaml',
};

/** Bigger than any real packaging file: skipped rather than regex-scanned. */
const MAX_CONFIG = 200_000;

type Found = { res: Resolution; pkgDir?: string };

/** Folders `where`/`from`/`package_dir` name in packaging config. Cheap regexes, not a TOML parser.
 * ponytail: only the common setuptools/poetry/hatch/setup.cfg spellings — upgrade path: a TOML reader. */
function configuredRoots(files: readonly SourceFile[]): string[] {
  const roots = new Set<string>(['', 'src']);
  for (const file of files) {
    const name = file.path.slice(file.path.lastIndexOf('/') + 1);
    if ((name !== 'pyproject.toml' && name !== 'setup.cfg') || file.content.length > MAX_CONFIG) continue;
    const dir = dirOf(file.path);
    const add = (value: string): void => { roots.add(joinPath(dir, value)); };
    for (const m of file.content.matchAll(/\b(?:where|from)\s*=\s*(?:\[([^\]]{0,2000})\]|"([^"]*)")/g)) {
      for (const v of (m[1] ?? m[2] ?? '').matchAll(/"([^"]*)"/g)) add(v[1]!);
      if (m[2] !== undefined) add(m[2]);
    }
    for (const m of file.content.matchAll(/\bpackages\s*=\s*\[([^\]]{0,2000})\]/g)) {
      for (const v of m[1]!.matchAll(/"([^"]*\/[^"]*)"/g)) add(dirOf(v[1]!));
    }
    for (const m of file.content.matchAll(/^[ \t]*package_dir[ \t]*=\s*=[ \t]*(\S+)/gm)) add(m[1]!);
  }
  return [...roots].sort();
}

export function createPythonResolver(files: readonly SourceFile[]): (from: string, raw: RawImport) => Resolution[] {
  const paths = files.map((f) => f.path).filter((p) => p.endsWith('.py')).sort();
  const known = new Set(paths);
  const dirs = new Set<string>();
  for (const p of paths) for (let d = dirOf(p); d !== '' && !dirs.has(d); d = dirOf(d)) dirs.add(d);
  const explicit = configuredRoots(files);
  // A folder holding `__init__.py` whose parent holds none is a top-level package; its parent is an import root.
  const autoRoots = new Map<string, string[]>();
  for (const p of paths) {
    if (!p.endsWith('/__init__.py') && p !== '__init__.py') continue;
    let top = dirOf(p);
    while (top !== '' && known.has(joinPath(dirOf(top), '__init__.py'))) top = dirOf(top);
    if (top === '') continue;
    const name = top.slice(top.lastIndexOf('/') + 1);
    const list = autoRoots.get(name) ?? [];
    if (!list.includes(dirOf(top))) list.push(dirOf(top));
    autoRoots.set(name, list);
  }

  /** `base` as a module: `base.py`, a package (`base/__init__.py`), or a namespace folder. */
  function module(base: string): Found | undefined {
    if (known.has(`${base}.py`)) return { res: { kind: 'file', to: `${base}.py` } };
    if (known.has(joinPath(base, '__init__.py'))) return { res: { kind: 'file', to: joinPath(base, '__init__.py') }, pkgDir: base };
    if (base !== '' && dirs.has(base)) return { res: { kind: 'dir', to: base }, pkgDir: base };
    return undefined;
  }

  /** The longest leading part of a dotted name that is a module under some root. */
  function absolute(from: string, dotted: string): { found?: Found; whole: boolean; used: number; external?: string } {
    const segments = dotted.split('.');
    const first = segments[0]!;
    const std = STDLIB.has(first);
    const roots = [...explicit, ...(autoRoots.get(first) ?? [])];
    // Sibling-folder imports (scripts, docs examples) work through the importing file's own folders, but a
    // module that shadows a stdlib name must not capture `import types` from its neighbours.
    if (!std) for (let d = dirOf(from); ; d = dirOf(d)) { roots.push(d); if (d === '') break; }
    for (let n = segments.length; n >= 1; n--) {
      const prefix = segments.slice(0, n).join('/');
      for (const root of roots) {
        const found = module(joinPath(root, prefix));
        // A bare folder matching only the first word (scripts/playwright/ for `playwright.sync_api`) is a coincidence, not the package.
        if (found && (n === segments.length || found.res.kind !== 'dir')) return { found, whole: n === segments.length, used: n };
      }
    }
    return { whole: false, used: 0, ...(std ? {} : { external: DIST[first] ?? first }) };
  }

  return (from, raw) => {
    const dots = /^\.*/.exec(raw.spec)![0].length;
    const rest = raw.spec.slice(dots);
    let base: Found | undefined;
    if (dots > 0) {
      let pkg = dirOf(from);
      // Climbing past the repo root (`...` from `pkg/a.py`) leaves the project: broken, not an edge to a root module.
      for (let i = 1; i < dots; i++) {
        if (pkg === '') return [{ kind: 'unresolved' }];
        pkg = dirOf(pkg);
      }
      // A path through a skipped folder (`tests`, `docs_src`) is off the map, not broken: callers often leave those files out.
      if (rest !== '' && isSkippedSource(`${joinPath(pkg, rest.replace(/\./g, '/'))}/_`)) return [{ kind: 'ignore' }];
      if (rest !== '') base = module(joinPath(pkg, rest.replace(/\./g, '/')));
      // `from . import x` at the repo root has no package to point at: only the names can resolve.
      else if (pkg === '') base = { res: { kind: 'ignore' }, pkgDir: '' };
      else base = known.has(joinPath(pkg, '__init__.py')) ? { res: { kind: 'file', to: joinPath(pkg, '__init__.py') }, pkgDir: pkg } : { res: { kind: 'dir', to: pkg }, pkgDir: pkg };
    } else {
      const hit = absolute(from, rest);
      if (hit.external !== undefined) return [{ kind: 'external', pkg: hit.external }];
      if (!hit.found) return [{ kind: 'ignore' }];
      // `import a.b.c` where only `a.b` exists names an attribute of a module: fine for a file, broken for a package.
      const next = hit.found.pkgDir === undefined ? undefined : `${hit.found.pkgDir}/${rest.split('.')[hit.used]}/_`;
      if (!hit.whole && next !== undefined && isSkippedSource(next)) return [{ kind: 'ignore' }];
      base = hit.whole || (hit.found.res.kind === 'file' && !hit.found.pkgDir) ? hit.found : undefined;
    }
    if (!base) return [{ kind: 'unresolved' }];
    const out: Resolution[] = [];
    let needsBase = !raw.names?.length;
    for (const name of raw.names ?? []) {
      const sub = name === '*' || base.pkgDir === undefined ? undefined : module(joinPath(base.pkgDir, name));
      if (sub) out.push(sub.res); else needsBase = true;
    }
    if (needsBase) out.unshift(base.res.kind === 'ignore' ? { kind: 'unresolved' } : base.res);
    return out;
  };
}
