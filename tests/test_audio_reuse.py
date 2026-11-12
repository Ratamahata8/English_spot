import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from audio_reuse import find_recording, normalize_text, recording_index
VOICE = 'en-GB-SoniaNeural'

class AudioReuseTests(unittest.TestCase):
    def test_normalization_keeps_intonation_and_word_boundaries(self):
        self.assertEqual(normalize_text('  Don’t   PLAY? '), "Don't PLAY?")
        self.assertNotEqual(normalize_text('Polish'), normalize_text('polish'))
        self.assertNotEqual(normalize_text('Who is she?'), normalize_text('Who is she.'))
        self.assertNotEqual(normalize_text('ice cream'), normalize_text('icecream'))

    def test_integrity_voice_and_root_are_checked_without_copying(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / 'audio'; out = root / 'en-GB'; out.mkdir(parents=True)
            folder = root / 'workbook/en-GB'; folder.mkdir(parents=True)
            good = folder / 'good.mp3'; good.write_bytes(b'fixture recording')
            bad = folder / 'bad.mp3'; bad.write_bytes(b'damaged')
            outside = Path(tmp) / 'outside.mp3'; outside.write_bytes(b'outside')
            def asset(path, voice=VOICE, checksum=None):
                return dict(path=path.name, voice=voice, sha256=checksum or hashlib.sha256(path.read_bytes()).hexdigest())
            m = {'broken': asset(bad, checksum='0'*64), 'what': asset(good), 'where': asset(good, voice='ru-RU-SvetlanaNeural'), 'got': asset(good, voice='eSpeak-NG')}
            m['outside'] = dict(asset(outside), path='../../../outside.mp3')
            (folder / 'manifest.json').write_text(json.dumps(m))
            before = sorted(str(p) for p in root.rglob('*'))
            index = recording_index(root)
            result = find_recording(index, 'what', VOICE, out, lambda p: True)
            self.assertEqual((out / result['path']).resolve(), good.resolve())
            self.assertEqual(result['text'], 'what')
            self.assertEqual(result['sha256'], hashlib.sha256(good.read_bytes()).hexdigest())
            self.assertEqual(sorted(str(p) for p in root.rglob('*')), before)
            for text in ['where', 'got', 'outside', 'broken']:
                self.assertIsNone(find_recording(index, text, VOICE, out, lambda p: True))
            self.assertIsNone(find_recording(index, 'what', VOICE, out, lambda p: False))

if __name__ == '__main__':
    unittest.main()
