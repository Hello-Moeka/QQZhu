import json
import re
import unittest
from pathlib import Path

import jinja2


class PlaylistJsonTests(unittest.TestCase):
    def test_json_cannot_close_script_and_preserves_values(self):
        root = Path(__file__).resolve().parents[1]
        env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(root / 'templates'), autoescape=True
        )
        attack = '</script><script>alert(1)</script>'
        song = dict(name=attack, artist='中文 "引号" & <标签>',
                    language=attack, genre='流行', url='-')
        languages = [attack, '中文']
        html = env.get_template('index.html').render(
            settings=dict(title='test', singer_intro='', singer_name='',
                          singer_url='', live_url='', background_url=''),
            songs=[song], languages=languages, genres=['流行'],
            songs_payload=[song], languages_payload=languages, song_count=1,
        )
        self.assertNotIn(attack, html)
        for element_id, expected in [('songs-json', [song]),
                                     ('languages-json', languages)]:
            match = re.search(
                rf'<script id="{element_id}" type="application/json">(.*?)</script>',
                html, re.S,
            )
            self.assertIsNotNone(match)
            self.assertEqual(json.loads(match.group(1)), expected)


if __name__ == '__main__':
    unittest.main()
