import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class SamsungTVValidation(unittest.TestCase):
    def validate(self, extra=''):
        source = (ROOT/'config.xml').read_text().replace('</widget>', extra+'</widget>')
        with tempfile.TemporaryDirectory() as directory:
            config = Path(directory)/'config.xml'
            config.write_text(source)
            return subprocess.run(['python3', str(ROOT/'scripts/validate-samsung-tv.py'), '--config', str(config)], text=True, capture_output=True)

    def test_current_app_matches_official_tv_resources(self):
        result = self.validate()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('Samsung TV 4.0', result.stdout)
        self.assertIn('Samsung TV 10.0', result.stdout)

    def test_unregistered_avplay_privilege_is_rejected(self):
        result = self.validate('<tizen:privilege name="http://developer.samsung.com/privilege/avplay"/>')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Unknown Samsung privilege', result.stderr)

    def test_partner_privilege_requires_separate_authorization(self):
        result = self.validate('<tizen:privilege name="http://developer.samsung.com/privilege/sso.partner"/>')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Restricted Samsung privilege', result.stderr)
