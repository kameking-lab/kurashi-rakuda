import urllib.request

urls = [
    ('https://www.city.miyazaki.miyazaki.jp/fs/8/7/7/1/4/0/_/________________.pdf.pdf', 'scratch/miyazaki1.pdf'),
    ('https://www.city.miyazaki.miyazaki.jp/fs/8/7/7/1/5/4/_/____________.pdf', 'scratch/miyazaki2.pdf')
]

for url, filename in urls:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response, open(filename, 'wb') as out_file:
            out_file.write(response.read())
        print(f"Downloaded {filename}")
    except Exception as e:
        print(f"Error downloading {filename}: {e}")
