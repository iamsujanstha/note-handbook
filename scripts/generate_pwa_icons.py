import zlib
import struct
import math
import os

def create_png(width, height, draw_func, is_maskable=False):
    # RGBA
    raw = bytearray()
    for y in range(height):
        raw.append(0) # filter type 0 (None)
        for x in range(width):
            r, g, b, a = draw_func(x, y, width, height, is_maskable)
            raw.extend((r, g, b, a))
    
    compressed = zlib.compress(bytes(raw), 9)
    
    png = bytearray(b'\x89PNG\r\n\x1a\n')
    
    # IHDR
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = struct.pack('>I', zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff)
    png.extend(struct.pack('>I', len(ihdr_data)))
    png.extend(b'IHDR')
    png.extend(ihdr_data)
    png.extend(ihdr_crc)
    
    # IDAT
    idat_crc = struct.pack('>I', zlib.crc32(b'IDAT' + compressed) & 0xffffffff)
    png.extend(struct.pack('>I', len(compressed)))
    png.extend(b'IDAT')
    png.extend(compressed)
    png.extend(idat_crc)
    
    # IEND
    iend_crc = struct.pack('>I', zlib.crc32(b'IEND') & 0xffffffff)
    png.extend(struct.pack('>I', 0))
    png.extend(b'IEND')
    png.extend(iend_crc)
    
    return bytes(png)

def icon_pixel(x, y, w, h, is_maskable):
    nx = x / float(w)
    ny = y / float(h)
    
    # Brand blue gradient
    t = (nx + ny) / 2.0
    bg_r = int(0x21 * (1 - t) + 0x0e * t)
    bg_g = int(0x85 * (1 - t) + 0x62 * t)
    bg_b = int(0xfc * (1 - t) + 0xd9 * t)
    
    if is_maskable:
        # Full bleed background for maskable icon
        # Safe zone is inner 70% (between 0.15 and 0.85)
        # Content centered in [0.2, 0.8]
        cx = (nx - 0.5) / 0.7 + 0.5
        cy = (ny - 0.5) / 0.7 + 0.5
    else:
        # Rounded squircle container
        # Radius ~ 0.22
        r = 0.22
        # Check rounded corners
        dx = max(0.0, max(r - nx, nx - (1.0 - r)))
        dy = max(0.0, max(r - ny, ny - (1.0 - r)))
        if dx * dx + dy * dy > r * r:
            return 0, 0, 0, 0 # Transparent outside squircle
        cx = nx
        cy = ny

    # Draw book inside [0.22, 0.78] in cx, cy space
    # Center is (0.5, 0.5)
    bx = (cx - 0.5) * 2.0 # [-1.0, 1.0]
    by = (cy - 0.5) * 2.0 # [-1.0, 1.0]

    # Bookmark ribbon: bx in [-0.08, 0.08], by in [-0.85, -0.2]
    if -0.07 <= bx <= 0.07 and -0.82 <= by <= -0.15:
        # Amber ribbon
        if by > -0.28 and abs(bx) < (by - (-0.28)) * 0.8:
            pass # V cutout at bottom of ribbon
        else:
            return 255, 189, 66, 255

    # Book pages body: bx in [-0.75, 0.75], by in [-0.55, 0.55]
    if -0.72 <= bx <= 0.72 and -0.52 <= by <= 0.52:
        # Spine in middle: abs(bx) < 0.05
        if abs(bx) <= 0.04:
            return 203, 213, 225, 255 # Spine color
        
        # Book pages
        # Left page: bx < -0.04, Right page: bx > 0.04
        # Horizontal lines on page
        is_line = False
        line_ys = [-0.3, -0.1, 0.1, 0.3]
        for ly in line_ys:
            if abs(by - ly) < 0.035:
                if (bx < -0.15 and bx > -0.65) or (bx > 0.15 and bx < 0.65):
                    is_line = True
                    break
        
        if is_line:
            if bx > 0.15 and abs(by - (-0.3)) < 0.035:
                return 24, 119, 242, 255 # Blue accent line on right page
            return 148, 163, 184, 255
        
        # Page white background
        return 255, 255, 255, 255

    return bg_r, bg_g, bg_b, 255

os.makedirs('public', exist_ok=True)

# Generate 192x192
with open('public/pwa-192x192.png', 'wb') as f:
    f.write(create_png(192, 192, icon_pixel, is_maskable=False))
print('Generated public/pwa-192x192.png')

# Generate 512x512
with open('public/pwa-512x512.png', 'wb') as f:
    f.write(create_png(512, 512, icon_pixel, is_maskable=False))
print('Generated public/pwa-512x512.png')

# Generate maskable 512x512
with open('public/pwa-maskable-512x512.png', 'wb') as f:
    f.write(create_png(512, 512, icon_pixel, is_maskable=True))
print('Generated public/pwa-maskable-512x512.png')

# Generate apple-touch-icon.png (180x180)
with open('public/apple-touch-icon.png', 'wb') as f:
    f.write(create_png(180, 180, icon_pixel, is_maskable=False))
print('Generated public/apple-touch-icon.png')
