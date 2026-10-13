#!/usr/bin/env python3
"""Install the checksum-pinned official headless SDK outside the checkout."""
import argparse
import hashlib
import io
import os
from pathlib import Path
import re
import subprocess
import tarfile
import urllib.request
import zipfile

URL = 'https://download.tizen.org/sdk/Installer/tizen-sdk_10.0/web-cli_Tizen_SDK_10.0_ubuntu-64.bin'
SHA256 = '65d2a569cbf0351dca4b94254f2c642d49195ac4964e08a76b4eaabc9ce4bed0'
PAYLOAD_MD5 = '08780716658c7801ffffee76e8b1db56'


def install(root):
    sdk = root / 'tizen-sdk-10'
    cli = sdk / 'tools/ide/bin/tizen'
    if cli.exists():
        subprocess.run([str(cli), 'version'], check=True)
        return cli
    root.mkdir(parents=True, exist_ok=True)
    cache = root / 'installer-cache'
    cache.mkdir(exist_ok=True)
    archive = cache / 'sdk10.bin'
    if not archive.exists():
        temporary = cache / 'sdk10.download'
        with urllib.request.urlopen(URL, timeout=120) as response, temporary.open('wb') as output:
            while block := response.read(1024 * 1024):
                output.write(block)
        temporary.replace(archive)
    data = archive.read_bytes()
    if hashlib.sha256(data).hexdigest() != SHA256:
        raise RuntimeError('Official installer SHA256 mismatch; remove the cached file and investigate. No installation performed.')
    lines = int(re.search(rb'ORI_FILE_LEN="(\d+)"', data[:16000])[1])
    payload = data.split(b'\n', lines - 1)[lines - 1]
    if hashlib.md5(payload).hexdigest() != PAYLOAD_MD5:
        raise RuntimeError('Official embedded payload checksum mismatch')
    extracted = cache / 'payload'
    with tarfile.open(fileobj=io.BytesIO(payload), mode='r:gz') as tar:
        tar.extractall(extracted, filter='data')
    # The original shell wrapper hardcodes $HOME extraction. Launch the same
    # verified CLI installer JAR with writable Java data storage instead.
    with zipfile.ZipFile(extracted / 'tizen-sdk.zip') as z:
        for name in z.namelist():
            if name.startswith('jdk/'):
                target = extracted / name
                if name.endswith('/'):
                    target.mkdir(parents=True, exist_ok=True)
                else:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(z.read(name))
                    if '/bin/' in name:
                        target.chmod(0o755)
    log = cache / 'install.log'
    with log.open('w') as output:
        result = subprocess.run([str(extracted / 'jdk/bin/java'), '-Duser.home=' + str(root), '-jar', 'installer.jar', '--accept-license', str(sdk)], cwd=extracted, stdout=output, stderr=subprocess.STDOUT)
    if result.returncode:
        raise RuntimeError('Installer failed, exit ' + str(result.returncode) + '. See ' + str(log))
    subprocess.run([str(cli), 'version'], check=True)
    return cli


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__ + ' Accepts the standard SDK license as part of installation. Requires Python 3.12+, Linux x86_64.')
    parser.add_argument('--root', type=Path, default=Path('/workspace/tizen-user-data'))
    args = parser.parse_args()
    if os.uname().machine != 'x86_64' or os.uname().sysname != 'Linux':
        parser.error('This pinned installer requires Linux x86_64')
    print('TIZEN_CLI=' + str(install(args.root.resolve())))
