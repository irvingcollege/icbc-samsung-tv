#!/usr/bin/env python3
"""Verify available Seller Office exports and ZIP them; report missing logo assets."""
from pathlib import Path
from PIL import Image
import argparse
import hashlib
import json
import zipfile

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--folder',type=Path,default=Path(__file__).resolve().parent.parent/'artifacts/seller-office-assets')
args=parser.parse_args();folder=args.folder
rules={'transparent-logo.png':((1920,1080),['PNG'],['RGBA'],300000),'background.jpg':((1920,1080),['JPEG'],['RGB'],300000),'full-color-icon.png':((512,423),['PNG'],['RGB','RGBA'],300000)}
report={'files':[],'missing':[],'complete':False}
for name in ['transparent-logo.png','background.jpg','full-color-icon.png']:
    if not (folder/name).exists():report['missing'].append(name)
paths=list(folder.glob('*.jpg'))+list(folder.glob('*.png'))
screenshots=[]
for file in sorted(paths):
    with Image.open(file) as image:
        size=image.size;mode=image.mode;format=image.format
        if file.name=='transparent-logo.png' and mode=='RGBA' and image.getextrema()[3][0]==255:raise RuntimeError('Logo PNG has no transparent pixels')
        image.verify()
    if file.name in rules:
        dims,formats,modes,limit=rules[file.name]
        if size!=dims or format not in formats or mode not in modes:raise RuntimeError('Wrong dimensions/format/mode: '+file.name)
    elif file.suffix=='.jpg' and file.name[0:2].isdigit():
        limit=500000
        if size not in [(1920,1080),(1280,720)] or format!='JPEG' or mode!='RGB':raise RuntimeError('Invalid screenshot: '+file.name)
        screenshots.append(file.name)
    else:raise RuntimeError('Unrecognized image export: '+file.name)
    count=file.stat().st_size
    if count>=limit:raise RuntimeError('Size limit exceeded: '+file.name)
    report['files'].append({'file':file.name,'width':size[0],'height':size[1],'format':format,'mode':mode,'bytes':count,'limitBytesExclusive':limit,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'verified':True})
if len(screenshots)<2:raise RuntimeError('At least two genuine screenshots are required')
report['complete']=not report['missing'];report['screenshots']=screenshots
(folder/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
(folder/'README.txt').write_text('ICBC Samsung Seller Office assets — PARTIAL SET\n\nBackground and screenshots come from the existing app, not generated imagery.\nScreenshots: actual Chromium rendering at 1920x1080, with unchanged local app files and real catalog bytes forwarded by the HTTPS capture harness. Not captured on a physical Samsung TV. See capture-provenance.json.\n\nMissing: official church logo source (SVG or high-resolution transparent PNG). The project cross icon is app artwork, not the official church logo. Therefore transparent-logo.png (1920x1080 RGBA) and full-color-icon.png (512x423) were not fabricated.\n\nEvery included image passed dimensions, format/mode and conservative decimal KB limits. See verification.json. This partial set is not a complete store submission.\n')
archive=folder.parent/'ICBC-Samsung-Seller-Office-Assets.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    names=[entry['file'] for entry in report['files']]+['capture-provenance.json','verification.json','README.txt']
    for name in sorted(names):
        file=folder/name
        if file.is_file():z.write(file,'ICBC-Samsung-Seller-Office-Assets/'+name)
with zipfile.ZipFile(archive) as z:
    if z.testzip() is not None:raise RuntimeError('ZIP integrity failure')
print(json.dumps(report,indent=2));print('ZIP:',archive)
