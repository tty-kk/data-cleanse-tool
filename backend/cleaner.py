"""
DataCleanse - 核心数据清洗引擎
支持 CSV/Excel 的去重、空值处理、格式转换、数据预览
"""
import pandas as pd
import io
import re
from typing import Optional
from fastapi import UploadFile

ALLOWED_EXTENSIONS = {'.csv', '.xlsx', '.xls'}


async def read_file(file: UploadFile) -> pd.DataFrame:
    """读取上传文件到 DataFrame"""
    ext = get_file_ext(file.filename)
    content = await file.read()
    if ext == '.csv':
        try:
            df = pd.read_csv(io.BytesIO(content), encoding='utf-8')
        except UnicodeDecodeError:
            df = pd.read_csv(io.BytesIO(content), encoding='gbk')
    else:
        df = pd.read_excel(io.BytesIO(content), engine='openpyxl')
    df.columns = [str(c).strip().replace(' ', '_').lower() for c in df.columns]
    return df


def get_file_ext(filename: str) -> str:
    match = re.search(r'(\.[^.]+)$', filename)
    if match:
        return match.group(1).lower()
    return ''


def preview(df: pd.DataFrame, rows: int = 20) -> dict:
    """返回数据预览信息"""
    return {
        'columns': list(df.columns),
        'dtypes': {c: str(df[c].dtype) for c in df.columns},
        'rows': len(df),
        'preview': df.head(rows).fillna('').to_dict(orient='records'),
        'null_counts': df.isnull().sum().to_dict(),
    }


def remove_duplicates(df: pd.DataFrame, columns: Optional[list] = None, keep: str = 'first') -> pd.DataFrame:
    """去重处理"""
    if columns:
        return df.drop_duplicates(subset=columns, keep=keep).reset_index(drop=True)
    return df.drop_duplicates(keep=keep).reset_index(drop=True)


def handle_nulls(df: pd.DataFrame, strategy: str = 'drop', fill_value: Optional[str] = None,
                 columns: Optional[list] = None) -> pd.DataFrame:
    """空值处理"""
    target_cols = columns if columns else df.columns
    df = df.copy()
    if strategy == 'drop_rows':
        df = df.dropna(subset=target_cols).reset_index(drop=True)
    elif strategy == 'drop_cols':
        df = df.dropna(axis=1, how='any')
    elif strategy == 'fill_value':
        for c in target_cols:
            if fill_value is not None:
                df[c] = df[c].fillna(fill_value)
    elif strategy == 'fill_mean':
        for c in target_cols:
            if pd.api.types.is_numeric_dtype(df[c]):
                df[c] = df[c].fillna(df[c].mean())
    elif strategy == 'fill_median':
        for c in target_cols:
            if pd.api.types.is_numeric_dtype(df[c]):
                df[c] = df[c].fillna(df[c].median())
    elif strategy == 'fill_forward':
        df[target_cols] = df[target_cols].fillna(method='ffill')
    elif strategy == 'fill_backward':
        df[target_cols] = df[target_cols].fillna(method='bfill')
    return df


def convert_types(df: pd.DataFrame, conversions: dict) -> pd.DataFrame:
    """列类型转换. conversions: {col: target_type}
    target_type: 'int', 'float', 'str', 'date', 'datetime'
    """
    df = df.copy()
    for col, dtype in conversions.items():
        if col not in df.columns:
            continue
        try:
            if dtype == 'int':
                df[col] = pd.to_numeric(df[col], errors='coerce').astype('Int64')
            elif dtype == 'float':
                df[col] = pd.to_numeric(df[col], errors='coerce')
            elif dtype == 'str':
                df[col] = df[col].astype(str)
            elif dtype == 'date':
                df[col] = pd.to_datetime(df[col], errors='coerce').dt.date
            elif dtype == 'datetime':
                df[col] = pd.to_datetime(df[col], errors='coerce')
        except Exception:
            pass
    return df


def filter_data(df: pd.DataFrame, column: str, operator: str, value: str) -> pd.DataFrame:
    """数据过滤"""
    if column not in df.columns:
        return df
    df = df.copy()
    if df[column].dtype in ['int64', 'float64', 'Int64']:
        val = float(value) if '.' in value else int(value)
        if operator == '==':
            return df[df[column] == val].reset_index(drop=True)
        elif operator == '!=':
            return df[df[column] != val].reset_index(drop=True)
        elif operator == '>':
            return df[df[column] > val].reset_index(drop=True)
        elif operator == '<':
            return df[df[column] < val].reset_index(drop=True)
        elif operator == '>=':
            return df[df[column] >= val].reset_index(drop=True)
        elif operator == '<=':
            return df[df[column] <= val].reset_index(drop=True)
    else:
        if operator == '==':
            return df[df[column].astype(str) == value].reset_index(drop=True)
        elif operator == '!=':
            return df[df[column].astype(str) != value].reset_index(drop=True)
        elif operator == 'contains':
            return df[df[column].astype(str).str.contains(value, na=False)].reset_index(drop=True)
    return df


def to_csv(df: pd.DataFrame) -> bytes:
    return df.to_csv(index=False).encode('utf-8-sig')


def to_excel(df: pd.DataFrame) -> bytes:
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Cleaned')
    return buf.getvalue()
