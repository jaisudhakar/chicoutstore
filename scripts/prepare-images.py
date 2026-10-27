#!/usr/bin/env python3
"""Prepare product images for the site from the original photos.

For every row in scripts/products.csv it reads <photos-dir>/<source> and writes:
  html/assets/img/products/<id>.webp   the photo, resized for the web
  html/assets/img/cutouts/<id>.webp    the garment cut out on a transparent background

Cut-outs use the ISNet background-removal model through onnxruntime:
  pip install onnxruntime numpy pillow
  curl -L -o isnet.onnx https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx

usage: python3 scripts/prepare-images.py PHOTOS_DIR [--model isnet.onnx] [--only id,id] [--skip-existing]
Without --model only the photos are resized (existing cut-outs are kept).
Then run scripts/build-catalog.py.
"""
import argparse
import csv
import os

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT_PHOTO = os.path.join(ROOT, 'html', 'assets', 'img', 'products')
OUT_CUT = os.path.join(ROOT, 'html', 'assets', 'img', 'cutouts')


def load_rows():
    with open(os.path.join(ROOT, 'scripts', 'products.csv'), newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


class Cutter:
    def __init__(self, model):
        import onnxruntime as ort
        self.sess = ort.InferenceSession(model, providers=['CPUExecutionProvider'])
        self.inp = self.sess.get_inputs()[0].name

    def mask(self, im):
        x = im.convert('RGB').resize((1024, 1024), Image.LANCZOS)
        a = np.asarray(x).astype(np.float32) / 255.0
        a = (a - np.array([0.485, 0.456, 0.406], np.float32)).transpose(2, 0, 1)[None]
        pred = self.sess.run(None, {self.inp: a})[0][0, 0]
        pred = (pred - pred.min()) / (pred.max() - pred.min() + 1e-8)
        m = Image.fromarray((pred * 255).astype(np.uint8)).resize(im.size, Image.LANCZOS)
        # firm up the edge: near-transparent → 0, near-opaque → 255
        arr = np.clip((np.asarray(m).astype(np.float32) - 40) * (255 / 175), 0, 255)
        return Image.fromarray(arr.astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))

    def cut(self, im):
        m = self.mask(im)
        rgba = im.convert('RGB')
        rgba.putalpha(m)
        bbox = m.point(lambda v: 255 if v > 24 else 0).getbbox()
        if bbox:
            pad = 12
            rgba = rgba.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad),
                              min(im.width, bbox[2] + pad), min(im.height, bbox[3] + pad)))
        rgba.thumbnail((900, 1200), Image.LANCZOS)
        return rgba


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('photos')
    ap.add_argument('--model')
    ap.add_argument('--only', default='')
    ap.add_argument('--skip-existing', action='store_true')
    args = ap.parse_args()
    only = {s for s in args.only.split(',') if s}
    os.makedirs(OUT_PHOTO, exist_ok=True)
    os.makedirs(OUT_CUT, exist_ok=True)
    cutter = Cutter(args.model) if args.model else None
    for r in load_rows():
        if only and r['id'] not in only:
            continue
        src = os.path.join(args.photos, r['source'])
        photo_out = os.path.join(OUT_PHOTO, r['id'] + '.webp')
        cut_out = os.path.join(OUT_CUT, r['id'] + '.webp')
        im = Image.open(src).convert('RGB')
        if not (args.skip_existing and os.path.exists(photo_out)):
            p = im.copy()
            p.thumbnail((900, 1200), Image.LANCZOS)
            p.save(photo_out, 'WEBP', quality=80, method=6)
        if cutter and not (args.skip_existing and os.path.exists(cut_out)):
            cutter.cut(im).save(cut_out, 'WEBP', quality=84, method=6)
        print(r['id'], flush=True)


if __name__ == '__main__':
    main()
