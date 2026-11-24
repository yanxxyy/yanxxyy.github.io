# 简历咨询 Agent

这个服务从仓库根目录的 `index.html` 提取公开简历内容，按经历和段落构建检索索引，再调用 DeepSeek 回答问题。检索在本地完成；发送给 DeepSeek 的仅有用户问题和相关公开简历片段。服务不保存聊天记录。代码只依赖 Python 标准库。

## 本地运行

在仓库根目录用 Python 3.11+ 运行：

```powershell
$env:DEEPSEEK_API_KEY = '<在本机设置你的密钥>'
python agent/server.py
```

检查 `http://127.0.0.1:8000/api/health`。前端在 `http://127.0.0.1:8765/` 预览时会自动连接本机的 `8000` 端口。

## Docker 部署

在仓库根目录构建并启动：

```powershell
docker build -f agent/Dockerfile -t resume-agent .
docker run -d --name resume-agent --restart unless-stopped --env-file agent/.env -p 8000:8000 resume-agent
```

复制 `agent/.env.example` 为服务器上的 `agent/.env`，在那里设置 `DEEPSEEK_API_KEY`。不要把 `.env` 或密钥提交到 GitHub。用已有反向代理给服务配置 HTTPS，再把公网地址写入 `index.html` 中的 `resume-agent-api` 元信息，例如 `https://api.example.com`。GitHub Pages 本身不能运行这个后端。

默认只允许在线简历和本地预览页面跨域访问。公网服务按 IP 限制为每分钟 12 次请求，单进程每天最多 200 次，并限制输入长度。重启容器会重置进程内计数，因此仍建议在 DeepSeek 控制台设置用量额度。每次修改简历正文后，重新构建并部署服务以更新索引。
