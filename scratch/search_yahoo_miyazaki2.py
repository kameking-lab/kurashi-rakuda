import urllib.request
import urllib.parse
import re

url = 'https://search.yahoo.co.jp/search?p=' + urllib.parse.quote('保育料 利用者負担額表 令和8年度 宮崎市 site:city.miyazaki.miyazaki.jp')
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    for link in re.findall(r'href=\"(https://www\.city\.miyazaki\.miyazaki\.jp/[^\"]+)\"', html):
        print(link)
except Exception as e:
    print(e)
