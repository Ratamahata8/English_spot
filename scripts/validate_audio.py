"""Offline coverage, integrity and MP3 decoding check. Requires ffprobe/ffmpeg."""
import hashlib
import json
import subprocess
from audio_content import OUT, texts

def valid(path):
    if not path.is_file() or path.stat().st_size < 500:
        return False
    p = subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(path)],capture_output=True,text=True)
    try:
        return p.returncode == 0 and float(p.stdout) > .1
    except ValueError:
        return False

def main():
    manifest_path=OUT/'manifest.json'
    manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    errors=[]
    for text in texts():
        a=manifest.get(text)
        if not a:
            errors.append(f'Нет аудио: {text}'); continue
        path=OUT/a['path']
        if not valid(path): errors.append(f'Повреждён/отсутствует MP3: {text}')
        elif hashlib.sha256(path.read_bytes()).hexdigest()!=a['sha256']: errors.append(f'Не совпадает SHA256: {text}')
        else:
            decode = subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(path),'-f','null','-'],capture_output=True)
            if decode.returncode: errors.append(f'Ошибка полного декодирования MP3: {text}')
    if errors:
        raise SystemExit('\n'.join(errors))
    print(f'Проверено: {len(texts())} строк, {len(list(OUT.glob("*.mp3")))} реальных MP3.')
if __name__=='__main__': main()
