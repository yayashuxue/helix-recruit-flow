#!/usr/bin/env python3
"""
数据库重置脚本 - 仅用于开发/原型阶段
此脚本会清空并重建数据库，包括session_states表
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from flask import Flask
from app import create_app, db

# 加载环境变量
load_dotenv()

def reset_database():
    # 创建应用实例
    app = create_app()
    
    with app.app_context():
        print("正在连接数据库...")
        # 获取数据库URL
        db_url = app.config.get('SQLALCHEMY_DATABASE_URI')
        if not db_url:
            print("错误: 未设置SQLALCHEMY_DATABASE_URI环境变量")
            sys.exit(1)
        
        # 创建数据库引擎
        engine = create_engine(db_url)
        
        print("正在删除所有表...")
        try:
            # 删除所有表
            db.drop_all()
            print("表删除成功！")
        except Exception as e:
            print(f"删除表失败: {str(e)}")
            return False
        
        print("正在创建新表...")
        try:
            # 创建所有表
            db.create_all()
            print("表创建成功！")
        except Exception as e:
            print(f"创建表失败: {str(e)}")
            return False
        
        print("创建初始用户数据...")
        try:
            # 导入模型
            from app.models import User
            
            # 创建演示用户
            demo_user = User(
                id="demo-user-123",
                email="demo@example.com",
                name="Demo User",
                company="Example Company"
            )
            
            db.session.add(demo_user)
            db.session.commit()
            print(f"创建演示用户成功: {demo_user.id}")
        except Exception as e:
            print(f"创建初始数据失败: {str(e)}")
            db.session.rollback()
            return False
        
        print("数据库重置成功！")
        return True

if __name__ == "__main__":
    print("⚠️ 警告: 此操作将清空数据库并重建所有表!")
    confirm = input("确定要继续吗? [y/N]: ")
    
    if confirm.lower() in ['y', 'yes']:
        success = reset_database()
        sys.exit(0 if success else 1)
    else:
        print("操作已取消。")
        sys.exit(0) 