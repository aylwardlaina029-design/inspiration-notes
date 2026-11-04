# -*- coding: utf-8 -*-
"""
sync_mirror_html.py —— 把 index.html 的图标同步到线上镜像 standalone.html。

规则：
1. index.html 是「图标真源」；镜像的 <svg> 元素自身属性（含资料库 data-page-node-id）保留不动。
2. 只替换 <svg> 内部内容；内部图形标签按**几何**匹配继承镜像原有的 data-page-node-id，
   几何对不上（即新增的图形）才生成确定性 id —— 保证可重复执行且结果稳定。
3. 锚点定位必须精确到**单个** svg：锚点若在 svg 内部取该 svg，否则取锚点之后最近的 svg。

背景：镜像的 body 带资料库导出的 data-page-node-id 标注，整段覆盖会破坏元素绑定。
"""
import hashlib
import io
import os
import re
import sys

BASE = os.path.dirname(os.path.abspath(__file__))

ICONS = [
    ('id="settings-gear"', '右上角菜单'),
    ('data-action="add"', '快速记录'),
    ('data-view="calendar"', '日历'),
    ('data-view="reflections"', '灵感'),
]

SVG_RE = re.compile(r'(?s)<svg\b[^>]*>.*?</svg>')
GEOM_RE = re.compile(r'<(?:path|rect|circle|line|polyline|polygon|ellipse)\b[^>]*?/?>')


def svg_blocks(html):
    return [(m.start(), m.end(), m.group(0)) for m in SVG_RE.finditer(html)]


def pick_svg(html, anchor):
    """精确挑出与锚点关联的**单个** svg 块"""
    i = html.find(anchor)
    if i < 0:
        return None
    blocks = svg_blocks(html)
    for s, e, b in blocks:                      # 锚点落在 svg 内部
        if s < i < e:
            return (s, e, b)
    for s, e, b in blocks:                      # 锚点在 svg 外部：取其后最近的一个
        if s >= i:
            return (s, e, b)
    return None


def split_svg(block):
    m = re.match(r'(?s)^(<svg\b[^>]*>)(.*)(</svg>)$', block)
    return m.group(1), m.group(2), m.group(3)


def geom_key(tag):
    """去掉 id 后的几何指纹（用于新旧图形配对）"""
    t = re.sub(r'\s*data-page-node-id="[^"]*"', '', tag)
    return re.sub(r'\s+', ' ', t).strip()


def tag_id(tag):
    m = re.search(r'data-page-node-id="([^"]+)"', tag)
    return m.group(1) if m else None


def add_id(tag, pid):
    if tag.endswith('/>'):
        return tag[:-2] + ' data-page-node-id="%s"/>' % pid
    return tag[:-1] + ' data-page-node-id="%s">' % pid


def carry_ids(old_inner, new_inner, used):
    """按几何把镜像原有的 id 继承到新内容上；配不上的生成确定性 id"""
    old_map = {}
    for m in GEOM_RE.finditer(old_inner):
        pid = tag_id(m.group(0))
        if pid:
            old_map.setdefault(geom_key(m.group(0)), pid)

    def repl(m):
        tag = m.group(0)
        if tag_id(tag):
            return tag
        pid = old_map.get(geom_key(tag))
        if pid is None:
            digest = hashlib.sha1(geom_key(tag).encode('utf-8')).hexdigest()[:22]
            pid = digest
            k = 2
            while pid in used:
                pid = hashlib.sha1((digest + str(k)).encode('utf-8')).hexdigest()[:22]
                k += 1
        used.add(pid)
        return add_id(tag, pid)

    return GEOM_RE.sub(repl, new_inner)


def main():
    src = io.open(os.path.join(BASE, 'index.html'), encoding='utf-8').read()
    mir_path = os.path.join(BASE, 'standalone.html')
    h = io.open(mir_path, encoding='utf-8').read()
    used = set(re.findall(r'data-page-node-id="([^"]+)"', h))
    n = 0

    for anchor, label in ICONS:
        sblk = pick_svg(src, anchor)
        mblk = pick_svg(h, anchor)
        if not sblk or not mblk:
            print('WARN: %s 未匹配（src=%s mirror=%s）' % (label, bool(sblk), bool(mblk)))
            continue
        s_open, s_inner, _ = split_svg(sblk[2])
        m_open, m_inner, m_close = split_svg(mblk[2])
        new_inner = carry_ids(m_inner, s_inner, used)
        new_block = m_open + new_inner + m_close
        if new_block != mblk[2]:
            h = h[:mblk[0]] + new_block + h[mblk[1]:]
            n += 1
            print('  更新 %s 图标' % label)
        else:
            print('  %s 图标已是最新' % label)

    # 清掉资料库导出遗留的 #view 内联底色（应为暖米白 #F7F5EF，不能是浅绿）
    h, k = re.subn(r'(<main id="view"[^>]*?)\sstyle="background-color: rgb\(226, 239, 217\);"', r'\1', h)
    if not k:
        h, k = re.subn(r'(<main id="view"[^>]*?)\sstyle="[^"]*background-color[^"]*"', r'\1', h)
    n += 1 if k else 0

    io.open(mir_path, 'w', encoding='utf-8').write(h)
    print('mirror html synced: %d 处更新' % n)
    return 0


if __name__ == '__main__':
    sys.exit(main())
