import os

search_dir = "c:/Users/Admin/thinktech/salary_frontend/src"
query_terms = ["allowCurrentCycleSalaryAccess", "salary/access", "salary-access", "allowCurrentCycle"]

for root, dirs, files in os.walk(search_dir):
    for file in files:
        if file.endswith((".js", ".jsx", ".ts", ".tsx")):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                for term in query_terms:
                    if term in content:
                        print(f"Found '{term}' in {path}")
            except Exception as e:
                pass
