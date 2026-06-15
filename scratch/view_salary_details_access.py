with open("c:/Users/Admin/thinktech/salary_frontend/src/components/SalaryDetailsAccess.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "axios" in line or "api" in line or "url" in line or "fetch" in line or "put" in line or "post" in line or "get" in line:
        print(f"{i+1}: {line.strip()}")
