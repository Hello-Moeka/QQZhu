import zipfile, os

EXCLUDE_DIRS = {'__pycache__', '.git', 'backup', 'QQZhuMusicList'}
EXCLUDE_EXTS = {'.pyc'}
EXCLUDE_FILES = {'QQZhuMusicList_pLrEh.zip', 'pack.py', 'QQZhu-1.0.1_NwjZN.zip'}
OUTPUT = '../QQZhu-multi-tenant.zip'

with zipfile.ZipFile(OUTPUT, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk('.'):
        # 排除不需要的目录
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith('.')]

        for f in files:
            if f.startswith('.'):
                continue
            if f in EXCLUDE_FILES:
                continue
            if any(f.endswith(ext) for ext in EXCLUDE_EXTS):
                continue
            filepath = os.path.join(root, f)
            arcname = filepath[2:] if filepath.startswith('./') else filepath
            zf.write(filepath, arcname)

# 列出打包内容
with zipfile.ZipFile(OUTPUT, 'r') as zf:
    names = sorted(zf.namelist())
    for name in names:
        print(name)
    size_kb = os.path.getsize(OUTPUT) / 1024
    size_mb = size_kb / 1024
    print(f'\n共 {len(names)} 个文件, 大小 {size_mb:.1f} MB')
