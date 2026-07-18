import urllib.request
import re
from bs4 import BeautifulSoup
req = urllib.request.Request('https://www.city.nagasaki.lg.jp/site/e-kao/20145.html', headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    soup = BeautifulSoup(html, 'html.parser')
    for a in soup.find_all('a'):
        href = a.get('href')
        if href and href.endswith('.pdf'):
            print(f"{href}: {a.text.strip()}")
except Exception as e:
    print(e)
