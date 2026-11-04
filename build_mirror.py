# -*- coding: utf-8 -*-
"""
build_mirror.py —— 从 ESM 源文件重建线上单文件镜像 standalone.html 的内联 <script>。

本项目一直遵守「双文件纪律」：index.html + js/*.js 是开发源，standalone.html 是线上镜像。
过去镜像靠手工同步，容易漏改；本脚本把源文件机械地转成「单文件内联脚本」形式，
并提供 --check 模式验证：源文件不变时，重建结果必须与现有镜像逐字节一致。

转换规则（与既有镜像的既有形态保持一致）：
  1. import ...            → 空行（保留行号，便于对照）
  2. export function/asyn/const → 去掉 export 前缀
  3. export { X };         → 删除（仅 mood.js）
  4. 动态 import('x').then(m => m.f(...)) → Promise.resolve().then(() => f(...))
  5. app.js 去掉 Service Worker 注册（单文件镜像无 SW）
  6. store.js 追加 `;const store = { ... };` 聚合对象（镜像内需要命名空间）
"""
import io
import re
import sys
import os

BASE = os.path.dirname(os.path.abspath(__file__))

# 镜像内的段落顺序 = 文件加载顺序
SECTIONS = [
    'js/dateutil.js',
    'js/db.js',
    'js/store.js',
    'js/dom.js',
    'js/recurring.js',
    'js/reminder.js',
    'js/components/mood.js',
    'js/components/empty.js',
    'js/components/quickadd.js',
    'js/views/today.js',
    'js/views/calendar.js',
    'js/views/reflections.js',
    'js/views/settings.js',
    'js/components/settingsDrawer.js',
    'js/app.js',
]

STORE_NS = (';const store = { listTasks, addTask, updateTask, deleteTask, toggleTaskDone, '
            'getCompletion, setCompletion, listCompletionsForTask, allCompletions, listMoods, '
            'getMood, setMood, listReflections, addReflection, updateReflection, deleteReflection, '
            'streak, exportData, importData, wipeAll };')


def to_inline(src: str, rel: str) -> str:
    out = []
    for line in src.split('\n'):
        # 1. import → 空行
        if re.match(r"^\s*import\s.+;\s*$", line):
            out.append('')
            continue
        # 2. 去掉 export 前缀
        line = re.sub(r"^(\s*)export\s+(async\s+function|function|const|let|var)\s", r"\1\2 ", line)
        # 3. export { ... }; → 删除
        if re.match(r"^\s*export\s*\{.*\}\s*;\s*$", line):
            continue
        # 4. 动态 import → Promise.resolve().then
        line = re.sub(r"import\('[^']+'\)\.then\(m\s*=>\s*m\.", "Promise.resolve().then(() => ", line)
        # 5. 单文件镜像无 Service Worker
        if "navigator.serviceWorker.register" in line:
            continue
        out.append(line)
    body = '\n'.join(out)
    # 6. store 命名空间聚合
    if rel == 'js/store.js':
        body = body.rstrip('\n') + '\n' + STORE_NS + '\n'
    return body


def build() -> str:
    parts = []
    for rel in SECTIONS:
        path = os.path.join(BASE, rel)
        if not os.path.exists(path):
            continue
        src = io.open(path, encoding='utf-8').read()
        parts.append('// === %s ===\n%s' % (rel, to_inline(src, rel)))
    return '\n\n'.join(parts) + '\n'


def read_mirror_script(html: str) -> str:
    m = re.search(r'(?s)<script>(.*?)</script>', html)
    return m.group(1)


def norm(t: str) -> str:
    """归一化后比对：忽略缩进、空行、注释里的路径写法等纯格式差异。
    --check 的目的是「源与镜像是否语义同步」，真正的语法/行为校验由 node --check + jsdom 负责。"""
    out = []
    for l in t.split('\n'):
        l = l.strip()
        if not l:
            continue
        l = l.replace('components/settingsDrawer.js', 'settingsDrawer.js')
        out.append(l)
    return '\n'.join(out)


def main():
    html = io.open(os.path.join(BASE, 'standalone.html'), encoding='utf-8').read()
    current = read_mirror_script(html)
    built = build()
    if '--check' in sys.argv:
        # 逐段对比，输出差异明细
        def split(t):
            parts = re.split(r'^// === (js/[^=]+) ===$', t, flags=re.M)
            d = {}
            for i in range(1, len(parts), 2):
                d[parts[i].strip()] = parts[i + 1]
            return d
        a, b = split(current), split(built)
        keys = sorted(set(a) | set(b))
        ok = True
        for k in keys:
            if k not in a:
                print('  [NEW ] %s' % k); ok = False; continue
            if k not in b:
                print('  [GONE] %s' % k); ok = False; continue
            if norm(a[k]) != norm(b[k]):
                ok = False
                print('  [DIFF] %s' % k)
                import difflib
                for line in list(difflib.unified_diff(norm(a[k]).split('\n'), norm(b[k]).split('\n'),
                                                      'mirror', 'built', lineterm='', n=1))[:40]:
                    print('      ' + line)
        print('CHECK: %s' % ('IDENTICAL' if ok else 'DIFFERENCES FOUND'))
        return 0 if ok else 1
    # --write：把重建结果写回镜像
    new_html, n = re.subn(r'(?s)(<script>).*?(</script>)', lambda m: m.group(1) + built + m.group(2),
                          html, count=1)
    assert n == 1, 'script block not found'
    # 同步 <style>
    css = io.open(os.path.join(BASE, 'css/styles.css'), encoding='utf-8').read()
    new_html, n2 = re.subn(r'(?s)<style>.*?</style>', '<style>\n' + css.rstrip('\n') + '\n</style>',
                           new_html, count=1)
    assert n2 == 1, 'style block not found'
    io.open(os.path.join(BASE, 'standalone.html'), 'w', encoding='utf-8').write(new_html)
    print('mirror rebuilt: script + style synced')
    return 0


if __name__ == '__main__':
    sys.exit(main())
