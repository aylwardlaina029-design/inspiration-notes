# -*- coding: utf-8 -*-
# 生成 PWA 图标 PNG：暖米白底 + 描边镂空叶子（底部实心），还原用户截图图案
# 几何：叶片 = 双圆弧透镜形（右弧圆心在左、左弧圆心在右）
import math, os
from PIL import Image, ImageDraw

BASE = os.path.dirname(os.path.abspath(__file__))
GREEN = (63, 135, 89, 255)      # #3F8759（截图精确主色）
CREAM = (247, 245, 239, 255)    # #F7F5EF（主题暖米白）

# ---- 叶片参数（叶尖朝上的局部坐标：尖端 y=-150，基部 y=+150）----
L = 150.0                            # 半长
W = 100.0                            # 最大半宽
C = (L**2 - W**2) / (2*W)            # 圆心偏移 62.5
R = W + C                            # 弧半径 162.5
S = 34.0                             # 描边宽
R_IN = R - S                         # 内弧半径 128.5
Y_IN = math.sqrt(R_IN**2 - C**2)     # 内透镜端点半高 112.3
Y_SOLID = 45.0                       # 实心区：y >= 45（基部约 1/3）
ROT = 40.0                           # 顺时针旋转角（叶尖指向右上）

def arc(cx, cy, r, a0, a1, n=72):
    return [(cx + r*math.cos(a0 + (a1-a0)*i/n), cy + r*math.sin(a0 + (a1-a0)*i/n)) for i in range(n+1)]

def lens(半):  # noqa: 占位防误用
    raise NotImplementedError

def lens_outline(half_end, r):
    """透镜轮廓（端点 (0,±half_end)，弧半径 r，圆心 (±C,0)）。
    右弧：圆心 (-C,0)，角度 atan2(-half_end,C) → atan2(+half_end,C)，经右侧；
    左弧：圆心 (+C,0)，角度 atan2(+half_end,-C) → atan2(-half_end,-C)+2π，经左侧。"""
    a_r0, a_r1 = math.atan2(-half_end, C), math.atan2(half_end, C)
    a_l0, a_l1 = math.atan2(half_end, -C), math.atan2(-half_end, -C) + 2*math.pi
    return arc(-C, 0, r, a_r0, a_r1) + arc(C, 0, r, a_l0, a_l1)

def solid_region():
    """透镜 ∩ (y>=Y_SOLID)：右弧截点→基部 → 左弧基部→截点，截点间直线闭合。"""
    dx = math.sqrt(R**2 - Y_SOLID**2)          # 水平半弦长
    a_r = math.atan2(Y_SOLID, dx)              # 右弧截角（圆心 -C）
    a_l = math.atan2(Y_SOLID, -dx)             # 左弧截角（圆心 +C），约 164°
    a_lb = math.atan2(L, -C)                   # 左弧基部端角，约 113°
    right = arc(-C, 0, R, a_r, math.atan2(L, C))   # 截点 → 右弧基部端点 (0,150)
    left  = arc( C, 0, R, a_lb, a_l)               # 基部端点 → 左弧截点
    return right + left

def rot_tr(pts, cx, cy, scale):
    a = math.radians(ROT)
    ca, sa = math.cos(a), math.sin(a)
    return [((x*ca - y*sa)*scale + cx, (x*sa + y*ca)*scale + cy) for x, y in pts]

def render(size, leaf_scale=1.0, rounded=True, ss=4):
    S_ = size * ss
    img = Image.new('RGBA', (S_, S_), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, S_-1, S_-1], radius=112*ss, fill=CREAM)
    else:
        d.rectangle([0, 0, S_, S_], fill=CREAM)
    cx = cy = S_/2
    k = S_/512 * leaf_scale
    outer = rot_tr(lens_outline(L, R), cx, cy, k)
    inner = rot_tr(lens_outline(Y_IN, R_IN), cx, cy, k)
    solid = rot_tr(solid_region(), cx, cy, k)
    # 描边环 = 外透镜填绿 → 内透镜填底色 → 底部实心填绿
    d.polygon(outer, fill=GREEN)
    d.polygon(inner, fill=CREAM)
    d.polygon(solid, fill=GREEN)
    return img.resize((size, size), Image.LANCZOS)

render(512, rounded=True).save(os.path.join(BASE, 'assets/icons/icon-512.png'))
render(192, rounded=True).save(os.path.join(BASE, 'assets/icons/icon-192.png'))
render(512, leaf_scale=0.62, rounded=False).save(os.path.join(BASE, 'assets/icons/icon-maskable.png'))
print('PNG 生成完成：icon-512 / icon-192 / icon-maskable')
