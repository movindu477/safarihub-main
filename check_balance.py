
file_path = r"c:\Users\USER\Desktop\GitHub Projects\safarihub-main\src\components\Admin.jsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

balance = 0
parens = 0
brackets = 0

for i, char in enumerate(content):
    if char == '{':
        balance += 1
    elif char == '}':
        balance -= 1
        if balance < 0:
            print(f"Unbalanced '}}' at index {i} (Line {content[:i].count('\\n') + 1})")
    elif char == '(':
        parens += 1
    elif char == ')':
        parens -= 1
        if parens < 0:
            print(f"Unbalanced ')' at index {i} (Line {content[:i].count('\\n') + 1})")
    elif char == '[':
        brackets += 1
    elif char == ']':
        brackets -= 1

print(f"Final Balance: {{}}: {balance}, (): {parens}, []: {brackets}")
