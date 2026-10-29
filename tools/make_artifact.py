#!/usr/bin/env python3
"""Macht aus live/index.html die Artifact-Fassung (ohne doctype/html/head/body-Rahmen)."""
import re, sys
src, dst = sys.argv[1], sys.argv[2]
drop = re.compile(r'^\s*(<!doctype html>|<html[^>]*>|</html>|<head>|</head>|<body>|</body>|<meta charset[^>]*>|<meta name="viewport"[^>]*>)\s*$', re.I)
lines = [l for l in open(src, encoding='utf-8').read().split('\n') if not drop.match(l)]
open(dst, 'w', encoding='utf-8').write('\n'.join(lines))
