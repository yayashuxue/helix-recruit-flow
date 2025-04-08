#!/usr/bin/env python3
"""
上下文管理系统测试脚本
此脚本测试会话状态管理和AI上下文感知功能
"""

import os
import sys
import json
import asyncio
from dotenv import load_dotenv
from flask import Flask

# 加载环境变量
load_dotenv()

# 确保可以导入应用模块
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app import create_app
from app.models import User, SessionState
from app.services.session_service import SessionService
from app.services.ai_service import AIService

async def test_context_management():
    """测试上下文管理系统"""
    # 创建应用实例和上下文
    app = create_app()
    with app.app_context():
        # 获取或创建测试用户
        from app.database.db import db
        user_id = "test-user-context"
        user = User.query.get(user_id)
        if not user:
            user = User(
                id=user_id,
                email="test@example.com",
                name="Test User",
                company="Test Company"
            )
            db.session.add(user)
            db.session.commit()
            print(f"创建测试用户: {user.id}")
        
        # 初始化服务
        session_service = SessionService.get_instance()
        ai_service = AIService.get_instance()
        
        # 测试1: 创建和获取会话状态
        print("\n🧪 测试1: 会话状态创建和获取")
        session = session_service.get_or_create_session(user_id)
        print(f"会话ID: {session.id}")
        
        # 测试2: 更新会话状态
        print("\n🧪 测试2: 会话状态更新")
        session = session_service.update_session(user_id, {
            'active_sequence_id': 'test-sequence-123',
            'last_action': 'test_action',
            'context_data': {
                'test_key': 'test_value',
                'sequence_position': 'Software Engineer',
                'sequence_title': 'Tech Recruiting',
            }
        })
        print(f"更新后的会话状态: {session.to_dict()}")
        
        # 测试3: 构建上下文感知系统提示
        print("\n🧪 测试3: 构建上下文感知系统提示")
        base_prompt = "这是基础系统提示。"
        enhanced_prompt = session_service.build_context_aware_system_prompt(base_prompt, user_id)
        print(f"增强后的系统提示:\n{enhanced_prompt}")
        
        # 测试4: 模拟AI响应并验证上下文处理
        print("\n🧪 测试4: 模拟AI响应处理")
        # 创建带上下文的测试消息
        test_messages = [
            {"role": "user", "content": "我需要为软件工程师创建一个招聘序列"},
            {"role": "assistant", "content": "我会帮您创建一个软件工程师的招聘序列。"},
            {"role": "user", "content": "好的"}  # 短消息测试
        ]
        
        # 获取会话上下文
        session_context = session_service.get_session_context(user_id)
        print(f"会话上下文: {json.dumps(session_context, indent=2, ensure_ascii=False)}")
        
        # 构建用户信息
        user_info = {
            'user_id': user_id,
            'company_name': user.company
        }
        
        try:
            # 调用AI服务生成响应
            print("\n正在生成AI响应，这可能需要几秒钟...")
            response = await ai_service.generate_chat_response(
                test_messages, 
                user_info,
                session_context
            )
            
            # 输出响应结果
            print(f"\n🤖 AI响应:\n{response.get('content')}")
            
            # 检查是否有工具调用
            tool_calls = response.get('tool_calls', [])
            if tool_calls:
                print(f"\n🧰 工具调用: {len(tool_calls)}")
                for i, call in enumerate(tool_calls):
                    print(f"  工具 {i+1}: {call['name']}")
            else:
                print("\n✅ 没有工具调用 - 这是好的！说明上下文管理起作用了")
                
            print("\n✅ 测试完成")
            
        except Exception as e:
            print(f"\n❌ 测试AI响应失败: {str(e)}")

if __name__ == "__main__":
    print("开始测试上下文管理系统...")
    asyncio.run(test_context_management()) 