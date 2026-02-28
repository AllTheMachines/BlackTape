import sqlite3
path = r'C:\Users\User\AppData\Roaming\mercury\taste.db'
conn = sqlite3.connect(path)
rows = conn.execute("SELECT key,value FROM ai_settings WHERE key LIKE 'spotify%'").fetchall()
print(rows)
conn.close()
