# 部署指南

## 🖥️ 本地运行（推荐用于开发和演示）

### 第一步：确认 Python 已安装

```bash
python --version
# 如果报错，试试:
python3 --version
# 或者:
py --version
```

需要 Python 3.10 或更高版本。

### 第二步：安装依赖

```bash
cd data-cleanse-tool
pip install -r backend/requirements.txt
```

### 第三步：启动

```bash
python backend/main.py
```

打开浏览器访问 http://localhost:8777

## ☁️ 在线部署（给别人用）

### Railway（最简单，免费额度足够）
1. 把整个项目推送到 GitHub
2. 注册 https://railway.app
3. New Project → Deploy from GitHub repo
4. Start Command: `python backend/main.py`
5. 部署完成后 Railway 会给你一个 *.railway.app 的链接

### Render（免费）
1. 推送代码到 GitHub
2. 注册 https://render.com
3. New Web Service → 选择仓库
4. Build Command: `pip install -r backend/requirements.txt`
5. Start Command: `python backend/main.py`
6. 选择 Free 计划即可

### 国内：阿里云/腾讯云轻量服务器（¥30/月）
```bash
# 连上服务器后
git clone <你的仓库地址>
cd data-cleanse-tool
pip install -r backend/requirements.txt

# 安装 screen
apt install screen  # Ubuntu/Debian
# 或者
yum install screen  # CentOS

# 启动（保持后台运行）
screen -S cleanse
python backend/main.py
# 按 Ctrl+A 然后按 D 退出

# 以后重连
screen -r cleanse
```

## 📎 获取公网链接

部署后你会得到一个 URL（如 https://your-app.railway.app），把这个链接：
1. 放到闲鱼商品描述里当演示
2. 放到 Upwork profile 里当作品集
3. 直接发给潜在客户让他们试用

## 🔧 常见问题

**Q: 端口被占用怎么办？**
A: 修改 backend/main.py 里的 port=8777 为其他端口

**Q: 如何支持更大的文件？**
A: 启动时加参数：`uvicorn backend.main:app --host 0.0.0.0 --port 8777 --limit-max-request-fields=1000000`

**Q: 如何加密码保护？**
A: 在 main.py 中添加 Basic Auth 中间件
