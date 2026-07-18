import fitz
import sys

doc = fitz.open(sys.argv[1])
for page_num in range(len(doc)):
    page = doc[page_num]
    words = page.get_text("words")
    words.sort(key=lambda w: (w[1], w[0]))

    rows = []
    cur_y = -1
    cur_row = []
    for w in words:
        y = w[1]
        if cur_y == -1 or abs(y - cur_y) < 5:
            cur_row.append(w[4])
            cur_y = y
        else:
            rows.append(cur_row)
            cur_row = [w[4]]
            cur_y = y
    rows.append(cur_row)

    print(f"--- Page {page_num + 1} ---")
    for row in rows:
        print(' '.join(row))
