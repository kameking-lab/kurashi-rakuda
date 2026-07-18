import fitz

def extract_table_grid(pdf_path):
    doc = fitz.open(pdf_path)
    page = doc[0]
    words = page.get_text("words")
    # words is a list of (x0, y0, x1, y1, text, block_no, line_no, word_no)
    
    # cluster y0 to find rows
    words.sort(key=lambda w: w[1])
    rows = []
    current_y = None
    current_row = []
    
    for w in words:
        if current_y is None or abs(w[1] - current_y) > 4:
            if current_row:
                current_row.sort(key=lambda w: w[0])
                rows.append(current_row)
            current_row = [w]
            current_y = w[1]
        else:
            current_row.append(w)
            
    if current_row:
        current_row.sort(key=lambda w: w[0])
        rows.append(current_row)
        
    for row in rows:
        texts = [w[4] for w in row]
        print(" | ".join(texts))

extract_table_grid('scratch/miyazaki2.pdf')
