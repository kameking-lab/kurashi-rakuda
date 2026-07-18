import fitz
import sys

def extract_table(pdf_path):
    doc = fitz.open(pdf_path)
    page = doc[0]
    blocks = page.get_text("blocks")
    blocks.sort(key=lambda b: (b[1], b[0]))
    for b in blocks:
        if "0" in b[4] or "円" in b[4]:
            print(b[4].replace('\n', ' '))

extract_table('scratch/miyazaki2.pdf')
