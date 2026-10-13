#!/usr/bin/env python3
"""Install verified Samsung TV validation resources; not the full IDE/emulator."""
import argparse
import hashlib
import io
from pathlib import Path, PurePosixPath
import urllib.request
import zipfile

URL = 'https://developer.samsung.com/SmartTV/file/1043260a-ce5c-4a9f-ab2e-4f7105fc3535'
PACKAGE = 'binary/tv-samsung-public-web-add-ons_10.0.0_ubuntu-64.zip'
SHA256 = 'c8e9d498504f29e8bf9320dab9e1cf89268e95eee65ff56c8d65a01fa0315086'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--image', type=Path, help='Previously downloaded official TV Extension 10.0 Ubuntu image')
parser.add_argument('--root', type=Path, default=Path('/workspace/tizen-user-data/samsung-tv10-resources'))
args = parser.parse_args()
cache = args.root / '.web-add-ons-10.0.0.zip'
if cache.exists() and args.image is None:
    payload = cache.read_bytes()
else:
    image = args.image or args.root.parent / 'installer-cache/samsung-tv10.zip'
    if not image.exists():
        image.parent.mkdir(parents=True, exist_ok=True)
        temp = image.with_suffix('.download')
        with urllib.request.urlopen(URL, timeout=120) as response, temp.open('wb') as output:
            while block := response.read(1024 * 1024):
                output.write(block)
        temp.replace(image)
    with zipfile.ZipFile(image) as outer:
        payload = outer.read(PACKAGE)
        # Vendor SHA256 from pkg_list_ubuntu-64, additionally pinned here.
        manifest = outer.read('pkg_list_ubuntu-64').decode()
        entry = next(block for block in manifest.split('\n\n') if 'Package : tv-samsung-public-web-add-ons\n' in block)
        if 'SHA256 : ' + SHA256 not in entry:
            raise RuntimeError('Official manifest checksum changed; investigate before installing')
if hashlib.sha256(payload).hexdigest() != SHA256:
    raise RuntimeError('Samsung package integrity mismatch')
args.root.mkdir(parents=True, exist_ok=True)
cache.write_bytes(payload)
with zipfile.ZipFile(io.BytesIO(payload)) as package:
    if package.testzip() is not None:
        raise RuntimeError('Corrupt Samsung resource ZIP')
    for info in package.infolist():
        if not info.filename.startswith('data/'):
            continue
        relative = PurePosixPath(info.filename).relative_to('data')
        if '..' in relative.parts or relative.is_absolute():
            raise RuntimeError('Unsafe Samsung package entry')
        target = args.root.joinpath(*relative.parts)
        if info.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(package.read(info))
print('Verified Samsung TV 10.0 validation resources installed at', args.root)
print('Full Package Manager/IDE installation and emulator runtime are separate, unverified capabilities.')
