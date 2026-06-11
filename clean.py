import sys

file_path = 'd:/Shresht-Systems_Management-System/public/purchaseOrder/purchaseOrder.html'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    line_num = i + 1
    if line_num == 246:
        new_lines.append('        <div id="new" style="display: none;"></div>\n')
    elif 247 <= line_num <= 438:
        continue
    elif line_num == 441:
        new_lines.append('        <div id="view" style="display: none;"></div>\n')
    elif 442 <= line_num <= 652:
        continue
    else:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Lines successfully replaced in purchaseOrder.html')
