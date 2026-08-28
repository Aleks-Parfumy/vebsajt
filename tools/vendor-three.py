#!/usr/bin/env python3
"""Vendor three.js into assets/vendor, so the site has no CDN dependency.

    tools/vendor-three.py [version]        # default: the version below

Downloads the core build plus every addon the site imports, following each
addon's own imports so nothing is missed, and mirrors them under

    assets/vendor/three/three.module.js
    assets/vendor/three/addons/...

which is what the importmap in index.html points at. Files are stored
unmodified: bare 'three' imports inside the addons are resolved by that
importmap at runtime, so upgrading is just re-running this script.
"""
import os
import re
import sys
import urllib.request

DEFAULT_VERSION = '0.160.0'

# Entry points: what *.js actually imports from 'three/addons/'.
ENTRIES = [
    'examples/jsm/loaders/GLTFLoader.js',
    'examples/jsm/environments/RoomEnvironment.js',
    'examples/jsm/postprocessing/EffectComposer.js',
    'examples/jsm/postprocessing/RenderPass.js',
    'examples/jsm/postprocessing/UnrealBloomPass.js',
    'examples/jsm/postprocessing/OutputPass.js',
]

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'assets/vendor/three')

# `from '…'`, `import '…'`, `import('…')`. Over-matches strings in comments,
# which is harmless: unresolvable ones are reported, not fetched.
SPEC = re.compile(r"""(?:\bfrom|\bimport)\s*\(?\s*['"]([^'"]+)['"]""")


def main(version):
    base = f'https://unpkg.com/three@{version}/'

    def fetch(path):
        with urllib.request.urlopen(base + path) as response:
            return response.read().decode()

    def write(path, text):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w') as handle:
            handle.write(text)

    # Minified core: it is 650KB instead of 1.3MB and nobody reads it.
    write(os.path.join(OUT, 'three.module.js'), fetch('build/three.module.min.js'))
    print(f'three@{version} core -> assets/vendor/three/three.module.js')

    seen, queue, unresolved = set(), list(ENTRIES), set()
    while queue:
        path = queue.pop()
        if path in seen:
            continue
        seen.add(path)

        text = fetch(path)
        write(os.path.join(OUT, 'addons', path[len('examples/jsm/'):]), text)

        for spec in SPEC.findall(text):
            if spec.startswith('.'):
                queue.append(os.path.normpath(
                    os.path.join(os.path.dirname(path), spec)).replace('\\', '/'))
            elif spec.startswith('three/addons/'):
                queue.append('examples/jsm/' + spec[len('three/addons/'):])
            elif spec != 'three':
                unresolved.add(spec)

    print(f'{len(seen)} addon files -> assets/vendor/three/addons/')
    if unresolved:
        # Usually URLs quoted in comments; check before assuming a real dep.
        print('specifiers not vendored (check these are not real imports):')
        for spec in sorted(unresolved):
            print('   ', spec)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_VERSION)
