import urllib.request
import urllib.parse
import re
import sys

city_name = sys.argv[1]
domain = sys.argv[2]
query = f'保育料 利用者負担額 令和8年度 {city_name} site:{domain} filetype:pdf'
url = 'https://search.yahoo.co.jp/search?p=' + urllib.parse.quote(query)

req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    for link in re.findall(r'href=\"(https://[^\"]+\.pdf)\"', html):
        print(link)
except Exception as e:
    print(e)
