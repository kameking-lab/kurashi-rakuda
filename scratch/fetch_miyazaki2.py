import urllib.request
import re
req = urllib.request.Request('https://www.city.miyazaki.miyazaki.jp/education/nursery/childcarecost/401146.html', headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    for link in re.findall(r'href=[\'\"]?([^\'\" >]+\.pdf)', html):
        print(link)
except Exception as e:
    print(e)
