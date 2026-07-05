"""
迁移脚本：将 17 个独立 QQZhu 实例数据迁移到多租户架构。
用法：python migrate.py
"""
import os
import shutil
import sqlite3
import asyncio
import sys

# 项目根目录
BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, "QQZhuMusicList")
INSTANCE = os.path.join(BASE, "instance")
UPLOADS = os.path.join(BASE, "static", "uploads")

# 17 个主播的迁移映射：{源目录名: (slug, display_name, admin_token)}
TENANTS = {
    "aki13908":       ("aki",     "阿啾Aki",           "aki1783678367"),
    "alice13900":     ("alice",   "百变魔女小脑斧promax", "alice12312486797"),
    "axuan13902":     ("axuan",   "阿谖axuan_",        "axuan2823798927"),
    "blood13904":     ("bld",     "媛娅blood",          "blood1278632872"),
    "cxofficial13909":("cx",      "程巽_official",      "cxofficial1y789921"),
    "hamu13899":      ("hamu",    "夢柰Hamu",           "hamu2312341423"),
    "jutantan13903":  ("jtt",     "居瘫瘫_lazy",        "jtt12873789379"),
    "mantou13914":    ("mantou",  "是小馒头ya",          "mantou283967123897"),
    "molly13913":     ("molly",   "茉荔吃不饱",          "molly367219347"),
    "mwxy13912":      ("mwxy",    "魔丸的星源",          "fxy2022864707"),
    "myiosus13910":   ("myiosus", "相里芽Myiosus",       "myiosus18237789327"),
    "noni13906":      ("noni",    "noni诺妮",           "noni12635726"),
    "pluvia13907":    ("pluvia",  "阿眠Pluvia",         "pluvia16737826786"),
    "xiaobao13905":   ("bao",     "小宝",               "bao18732897987"),
    "yexiaoxin13901": ("yxx",     "_夜小信",            "yxx17368723689"),
    "znr13911":       ("znr",     "昭柠儿",              "znr1873892901087"),
    "zyy13898":       ("zyy",     "左右右caprini",       "2760708142"),
}


def migrate_tenant(src_dir, slug, name, token):
    """迁移单个租户的数据。"""
    print(f"\n[{slug}] 迁移中... (源: {src_dir})")

    # 1. 复制数据库
    src_db = os.path.join(SRC, src_dir, "instance", "qqzhu.db")
    dst_db = os.path.join(INSTANCE, f"{slug}.db")
    if not os.path.exists(src_db):
        print(f"  ✗ 源数据库不存在: {src_db}")
        return False
    os.makedirs(INSTANCE, exist_ok=True)
    shutil.copy2(src_db, dst_db)

    # 验证并统计
    conn = sqlite3.connect(dst_db)
    songs = conn.execute("SELECT COUNT(*) FROM songs").fetchone()[0]
    settings = {r[0]: r[1] for r in conn.execute("SELECT key, value FROM site_settings")}
    conn.close()
    print(f"  ✓ 数据库: {songs} 首歌曲, 歌手: {settings.get('singer_name', '?')}")

    # 2. 复制上传文件
    src_uploads = os.path.join(SRC, src_dir, "static", "uploads")
    dst_uploads = os.path.join(UPLOADS, slug)
    upload_count = 0
    if os.path.isdir(src_uploads):
        os.makedirs(dst_uploads, exist_ok=True)
        for fname in os.listdir(src_uploads):
            src_f = os.path.join(src_uploads, fname)
            dst_f = os.path.join(dst_uploads, fname)
            if os.path.isfile(src_f):
                shutil.copy2(src_f, dst_f)
                upload_count += 1
        print(f"  ✓ 上传文件: {upload_count} 个")
    else:
        print(f"  - 无上传文件")

    # 3. 写入 tenants.db（通过直接操作 SQLite）
    tenants_db = os.path.join(INSTANCE, "tenants.db")
    tconn = sqlite3.connect(tenants_db)
    tconn.execute(
        "INSERT OR REPLACE INTO tenants (slug, name, admin_token, is_active) VALUES (?, ?, ?, 1)",
        (slug, name, token),
    )
    tconn.commit()
    tconn.close()
    print(f"  ✓ 租户注册: slug={slug}, token={'已设置' if token else '未设置'}")

    return True


async def main():
    # 确保目录存在
    os.makedirs(INSTANCE, exist_ok=True)

    # 初始化 tenants.db
    tenants_db = os.path.join(INSTANCE, "tenants.db")
    tconn = sqlite3.connect(tenants_db)
    tconn.execute("""
        CREATE TABLE IF NOT EXISTS tenants (
            slug TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            admin_token TEXT DEFAULT '',
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    # 保留已有的 default 租户
    existing = tconn.execute("SELECT slug FROM tenants").fetchall()
    tconn.commit()
    tconn.close()
    print(f"已有租户: {[r[0] for r in existing]}")

    # 执行迁移
    success = 0
    fail = 0
    for src_dir, (slug, name, token) in TENANTS.items():
        if migrate_tenant(src_dir, slug, name, token):
            success += 1
        else:
            fail += 1

    print(f"\n{'='*50}")
    print(f"迁移完成: 成功 {success}, 失败 {fail}")
    print(f"{'='*50}")

    # 最终统计
    tconn = sqlite3.connect(tenants_db)
    total = tconn.execute("SELECT COUNT(*) FROM tenants").fetchone()[0]
    print(f"总租户数: {total}")
    for row in tconn.execute("SELECT slug, name, admin_token, is_active FROM tenants ORDER BY slug"):
        print(f"  {row[0]:12s} | {row[1]:20s} | token={'set' if row[2] else 'empty'} | {'active' if row[3] else 'inactive'}")
    tconn.close()

    # 列出数据库文件
    dbs = [f for f in os.listdir(INSTANCE) if f.endswith('.db')]
    total_size = sum(os.path.getsize(os.path.join(INSTANCE, f)) for f in dbs)
    print(f"\n数据库文件: {len(dbs)} 个, 总大小 {total_size/1024/1024:.1f} MB")


if __name__ == "__main__":
    asyncio.run(main())
