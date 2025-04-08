#!/usr/bin/env python3
"""
清空数据库表脚本 - 保留表结构但删除所有数据
"""

import os
import sys
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

def truncate_all_tables():
    # 导入必要的模块
    from app import create_app
    from app.database.db import db
    from sqlalchemy import text
    
    # 创建应用实例
    app = create_app()
    
    with app.app_context():
        print("连接数据库...")
        
        try:
            # 导入所有模型以确保它们已注册
            from app.models import User, Sequence, SequenceStep, ChatMessage
            
            # 获取所有表名
            tables = db.metadata.tables.keys()
            print(f"发现以下表: {', '.join(tables)}")
            
            # 开始事务
            with db.engine.begin() as connection:
                # 禁用外键约束 (PostgreSQL方式)
                connection.execute(text("SET session_replication_role = 'replica';"))
                
                # 清空每个表
                for table in tables:
                    print(f"清空表 '{table}'...")
                    connection.execute(text(f"TRUNCATE TABLE {table} CASCADE;"))
                
                # 重新启用外键约束
                connection.execute(text("SET session_replication_role = 'origin';"))
            
            print("所有表已成功清空！")
            return True
            
        except Exception as e:
            print(f"清空表时出错: {str(e)}")
            return False

if __name__ == "__main__":
    print("⚠️ 警告: 此操作将删除所有表中的数据!")
    confirm = input("确定要继续吗? [y/N]: ")
    
    if confirm.lower() in ['y', 'yes']:
        success = truncate_all_tables()
        sys.exit(0 if success else 1)
    else:
        print("操作已取消。")
        sys.exit(0)