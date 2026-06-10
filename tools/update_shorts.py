# -*- coding: utf-8 -*-
# 광선교회 유튜브 채널의 쇼츠 목록을 수집하고,
# 외부(홈페이지)에서 재생 불가능한 영상은 걸러서 data/shorts.json 에 저장.
# GitHub Actions가 3일마다 자동 실행.
import re, json, os, urllib.request, datetime

CHANNEL_SHORTS_URL = 'https://www.youtube.com/@%EA%B4%91%EC%84%A0%EA%B5%90%ED%9A%8C/shorts'
OUT = 'data/shorts.json'
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      'Accept-Language': 'ko,en;q=0.9'}

def fetch(url, timeout=30):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode('utf-8', 'ignore')

def embeddable(video_id):
    """oembed가 200이면 외부 사이트 재생 가능"""
    url = f'https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json'
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status == 200
    except Exception:
        return False

def main():
    html = fetch(CHANNEL_SHORTS_URL)
    ids = list(dict.fromkeys(re.findall(r'"videoId":"([\w-]{11})"', html)))
    print(f'채널에서 발견된 쇼츠: {len(ids)}개')

    if not ids:
        # 유튜브 페이지 구조가 바뀌어 수집 실패 시 기존 목록 유지 (빈 목록으로 덮어쓰지 않음)
        print('수집 실패 — 기존 목록 유지')
        if os.path.exists(OUT):
            data = json.load(open(OUT, encoding='utf-8'))
            data['updated'] = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
            data['note'] = 'scrape failed, kept previous list'
            json.dump(data, open(OUT, 'w', encoding='utf-8'), indent=2)
        return

    ok = [i for i in ids if embeddable(i)]
    print(f'외부 재생 가능: {len(ok)}/{len(ids)}개')

    os.makedirs('data', exist_ok=True)
    data = {
        'updated': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'ids': ok,
    }
    json.dump(data, open(OUT, 'w', encoding='utf-8'), indent=2)
    print('data/shorts.json 갱신 완료')

if __name__ == '__main__':
    main()
