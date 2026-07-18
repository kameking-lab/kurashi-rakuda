import fitz
import sys
import json

def parse_pdf(pdf_path):
    print(f"--- Parsing {pdf_path} ---")
    doc = fitz.open(pdf_path)
    for page_num in range(len(doc)):
        page = doc[page_num]
        print(f"Page {page_num + 1}")
        text = page.get_text("text")
        if '利用者負担額' in text or '保育料' in text:
            print(text[:500])

parse_pdf('scratch/miyazaki1.pdf')
parse_pdf('scratch/miyazaki2.pdf')
