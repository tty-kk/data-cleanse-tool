"""
DataCleanse API - 数据清洗后端服务
"""
import os
import uuid
import cleaner
from fastapi import FastAPI, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="DataCleanse", version="1.0.0")

# CORS - 允许前端开发服务器访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载前端静态文件（API 优先，前端首页做 fallback）
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
if os.path.exists(frontend_dir):
    @app.get("/")
    async def serve_frontend():
        from fastapi.responses import FileResponse
        index_file = os.path.join(frontend_dir, 'index.html')
        return FileResponse(index_file)

# 内存中暂存当前 DataFrame，按 session_id 索引
sessions: dict = {}
CLEANED_DIR = os.path.join(os.path.dirname(__file__), '..', 'cleaned')
os.makedirs(CLEANED_DIR, exist_ok=True)


@app.post("/api/upload")
async def upload_file(file: UploadFile):
    """上传文件并预览"""
    ext = cleaner.get_file_ext(file.filename)
    if ext not in cleaner.ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"不支持的文件格式: {ext}，仅支持 CSV、XLSX")
    
    df = await cleaner.read_file(file)
    session_id = str(uuid.uuid4())
    sessions[session_id] = df
    return {
        "session_id": session_id,
        "file_name": file.filename,
        "preview": cleaner.preview(df),
    }


@app.get("/api/preview/{session_id}")
async def get_preview(session_id: str):
    """获取当前数据预览"""
    df = sessions.get(session_id)
    if df is None:
        raise HTTPException(404, "Session not found")
    return cleaner.preview(df)


@app.post("/api/clean/{session_id}")
async def clean_data(session_id: str,
                     operation: str = Form(...),
                     columns: str = Form(""),
                     keep: str = Form("first"),
                     strategy: str = Form("drop"),
                     fill_value: str = Form(""),
                     operator: str = Form("=="),
                     value: str = Form(""),
                     conversions: str = Form("{}")):
    """执行清洗操作"""
    import json
    df = sessions.get(session_id)
    if df is None:
        raise HTTPException(404, "Session not found")

    col_list = [c.strip() for c in columns.split(",") if c.strip()]

    if operation == "dedup":
        df = cleaner.remove_duplicates(df, columns=col_list if col_list else None, keep=keep)
    elif operation == "nulls":
        df = cleaner.handle_nulls(df, strategy=strategy, fill_value=fill_value if fill_value else None,
                                  columns=col_list if col_list else None)
    elif operation == "convert":
        conv = json.loads(conversions)
        df = cleaner.convert_types(df, conv)
    elif operation == "filter":
        if columns:
            df = cleaner.filter_data(df, col_list[0] if col_list else columns, operator, value)
    else:
        raise HTTPException(400, f"未知操作: {operation}")

    sessions[session_id] = df
    return cleaner.preview(df)


@app.post("/api/undo/{session_id}")
async def undo(session_id: str):
    """当前版本简化版：重新上传才是真撤销，这里做占位"""
    return {"message": "暂存操作已记录"}


@app.get("/api/download/{session_id}")
async def download(session_id: str, fmt: str = "csv"):
    """下载清洗后的数据"""
    df = sessions.get(session_id)
    if df is None:
        raise HTTPException(404, "Session not found")

    if fmt == "csv":
        content = cleaner.to_csv(df)
        media_type = "text/csv"
        filename = f"cleaned_data_{session_id[:8]}.csv"
    elif fmt == "xlsx":
        content = cleaner.to_excel(df)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"cleaned_data_{session_id[:8]}.xlsx"
    else:
        raise HTTPException(400, "不支持的格式")

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@app.get("/api/columns/{session_id}")
async def get_columns(session_id: str):
    """获取所有列名和类型"""
    df = sessions.get(session_id)
    if df is None:
        raise HTTPException(404, "Session not found")
    return {
        "columns": [
            {"name": c, "dtype": str(df[c].dtype), "sample": str(df[c].iloc[0]) if len(df) > 0 else ""}
            for c in df.columns
        ]
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8777"))
    uvicorn.run(app, host="0.0.0.0", port=port)
