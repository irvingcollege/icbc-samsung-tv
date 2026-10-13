#!/usr/bin/env python3
"""Check ICBC against official Samsung TV 4.0 and 10.0 schema/privilege resources."""
import argparse
from pathlib import Path
from lxml import etree

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--resources', type=Path, default=Path('/workspace/tizen-user-data/samsung-tv10-resources'))
parser.add_argument('--config', type=Path, default=Path(__file__).resolve().parent.parent/'config.xml')
args = parser.parse_args()
xml_parser = etree.XMLParser(no_network=True, resolve_entities=False)
doc = etree.parse(str(args.config), xml_parser)
TIZEN = '{http://tizen.org/ns/widgets}'
assert doc.find(TIZEN+'profile').get('name') == 'tv-samsung', 'Expected Samsung TV profile'
assert doc.find(TIZEN+'application').get('required_version') == '4.0', 'Minimum version changed; update target checks'
for version in ['4.0', '10.0']:
    base = args.resources/'platforms'/('tizen-'+version)/'tv-samsung'
    widget = etree.XMLSchema(etree.parse(str(base/'schemas/widgets.xsd'), xml_parser))
    extension = etree.XMLSchema(etree.parse(str(base/'schemas/widgets.tizen.xsd'), xml_parser))
    widget.assertValid(doc)
    for element in doc.getroot():
        if element.tag.startswith(TIZEN):
            extension.assertValid(element)
    known = {el.get('key'): el.get('level', 'public') for el in etree.parse(str(base/'privileges/privilege-wrt.properties'), xml_parser).findall('entry')}
    for privilege in doc.findall(TIZEN+'privilege'):
        name = privilege.get('name')
        if name.startswith('http://developer.samsung.com/'):
            assert name in known, 'Unknown Samsung privilege: '+name
            assert known[name] == 'public', 'Restricted Samsung privilege: '+name
    print('Official Samsung TV '+version+' widget/Tizen schemas and Samsung privilege catalog: PASS')
# Minimum target's native TV privilege catalog documents remote/input and Internet.
base = args.resources/'platforms/tizen-4.0/tv/privileges/privilege-wrt.properties'
public = {el.get('key') for el in etree.parse(str(base), xml_parser).findall('entry') if el.get('level','public')=='public'}
for el in doc.findall(TIZEN+'privilege'):
    if el.get('name').startswith('http://tizen.org/'):
        assert el.get('name') in public, 'Unsupported native TV privilege: '+el.get('name')
print('Minimum-target native TV privilege catalog: PASS')
print('No physical TV, emulator playback, certificate trust or Seller Office certification is claimed.')
