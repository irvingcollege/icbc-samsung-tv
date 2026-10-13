#!/usr/bin/env python3
"""Validate against the installed SDK's official generic widget/Tizen XSDs."""
import argparse
import os
from pathlib import Path
from lxml import etree

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--sdk', type=Path, default=Path(os.environ.get('TIZEN_SDK_PATH', '/workspace/tizen-user-data/tizen-sdk-10')))
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
schemas = args.sdk / 'platforms/tizen-10.0/tizen/schemas'
# Local official imports are permitted; remote schema retrieval and DTDs are not.
xml_parser = etree.XMLParser(no_network=True, resolve_entities=False)
widget = etree.XMLSchema(etree.parse(str(schemas / 'widgets.xsd'), xml_parser))
tizen = etree.XMLSchema(etree.parse(str(schemas / 'widgets.tizen.xsd'), xml_parser))
document = etree.parse(str(root / 'config.xml'), xml_parser)
widget.assertValid(document)
for element in document.getroot():
    if element.tag.startswith('{http://tizen.org/ns/widgets}'):
        tizen.assertValid(element)
print('Official SDK 10 widget and Tizen extension schemas: PASS')
print('Generic schemas only; Samsung TV extension, signing trust and hardware behavior are separate checks.')
