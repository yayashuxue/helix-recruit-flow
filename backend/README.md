# Helix Recruiting Assistant - Backend

## 上下文管理系统实现

最近添加了会话上下文管理系统，解决了 AI 在对话过程中无法保持上下文的问题。该系统使 AI 能够记住活跃的序列，并正确处理简短命令，避免不必要地重新生成序列。

### 主要特性

1. **SessionState 模型**: 跟踪用户会话状态，包括活跃序列和上下文数据
2. **SessionService**: 会话状态服务，管理上下文操作
3. **上下文感知系统提示**: 动态生成包含当前上下文的 AI 系统提示
4. **短消息处理**: 正确处理简短命令而不会触发序列重新生成

## 设置与运行

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 环境变量

创建`.env`文件:

```
FLASK_APP=app
FLASK_ENV=development
SQLALCHEMY_DATABASE_URI=sqlite:///helix.db
ANTHROPIC_API_KEY=your_api_key_here
```

### 3. 数据库重置 (开发环境)

由于当前处于原型开发阶段，可以使用重置脚本清空并重建数据库：

```bash
python reset_db.py
```

注意：此操作会**删除所有现有数据**并重建数据库结构。

### 4. 运行服务器

```bash
python run.py
```

## API 端点

- `/api/chat/message` - 发送聊天消息
- `/api/sequences/generate` - 生成新的招聘序列
- `/api/sequences/update` - 更新现有序列

## 上下文管理工作原理

1. 每个用户会话都有一个持久化的会话状态
2. 会话状态跟踪活跃的序列 ID 和最近的操作
3. 在每次 AI 请求中，将上下文信息注入到系统提示中
4. 对于简短消息，会添加特殊的指示以避免重新生成序列

## 技术实现

- `SessionState` 模型 - 存储会话状态
- `SessionService` - 管理会话状态操作
- 会话上下文的动态系统提示生成
- 前后端状态同步
