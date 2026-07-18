import fitz

doc = fitz.open('scratch/miyazaki2.pdf')
page = doc[0]
for text in page.get_text("text").split('\n'):
    print(text)
