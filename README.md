# DataCleanse - 智能数据清洗工具

> 上传 CSV/Excel，一键去重、空值处理、类型转换、数据过滤，秒级下载清洗结果。

## 🚀 快速开始

### 前提条件
- Python 3.10+
- pip

### 安装 & 运行

```bash
# 1. 进入项目目录
cd data-cleanse-tool

# 2. 安装依赖
pip install -r backend/requirements.txt

# 3. 启动服务（浏览器自动打开 http://localhost:8777）
python backend/main.py
```

打开浏览器访问 http://localhost:8777 即可使用。

## ✨ 功能

| 功能 | 说明 |
|------|------|
| 📂 文件上传 | 支持 CSV、XLSX、XLS 格式，拖拽或点击上传 |
| 👁️ 数据预览 | 上传后立即展示前20行数据，含列名和类型 |
| 🔍 去重 | 按指定列或全列去重，支持保留首/尾/全部删除 |
| 📭 空值处理 | 删除、填充指定值、均值、中位数、前后填充 |
| 🔄 类型转换 | 将列转为 int/float/str/date/datetime |
| 🔎 数据过滤 | 按条件筛选数据（等于、大于、小于、包含等） |
| ⬇ 下载 | 一键下载清洗后的 CSV 或 Excel 文件 |

## 📊 技术栈

- **后端**: Python + FastAPI + pandas + openpyxl
- **前端**: 纯 HTML/CSS/JS，无需构建工具

## ☁️ 一键部署

### 方式一：Railway（推荐，免费）
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

1. 点击上方按钮
2. 关联 GitHub 仓库
3. 添加 Python 环境变量，启动命令：`python backend/main.py`

### 方式二：Render（免费）
1. Fork 本仓库到 GitHub
2. 在 [render.com](https://render.com) 新建 Web Service
3. 选择仓库，设置：
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `python backend/main.py`

### 方式三：阿里云/腾讯云服务器
```bash
# 在云服务器上
git clone <你的仓库地址>
cd data-cleanse-tool
pip install -r backend/requirements.txt

# 使用 nohup 或 screen 保持后台运行
nohup python backend/main.py > server.log 2>&1 &
```

## 💼 接单用途

部署完成后，你可以：
1. 把链接发给客户直接演示——他们不用装任何东西
2. 展示给 Upwork/闲鱼客户看你的工作成果
3. 在此基础上给客户做定制化开发（特殊格式、特定规则、API 集成）
4. 部署到公司内网做内部工具

## 📝 License

MIT
