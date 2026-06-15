with open("c:/Users/Admin/thinktech/salary_frontend/src/components/SalaryDetailsAccess.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(50, 115):
    if i < len(lines):
        print(f"{i+1}: {lines[i].strip()}")
