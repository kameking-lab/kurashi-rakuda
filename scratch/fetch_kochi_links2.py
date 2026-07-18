import urllib.request
import re
req = urllib.request.Request('https://www.city.kochi.kochi.jp/soshiki/34/hoikuryo.html', headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    for m in re.finditer(r'<a[^>]*href=[\'\"]([^\'\"]+\.pdf)[\'\"][^>]*>(.*?)</a>', html, re.DOTALL):
        href = m.group(1)
        text = re.sub(r'<[^>]+>', '', m.group(2)).strip()
        print(f"{href}: {text}")
except Exception as e:
    print(e)
