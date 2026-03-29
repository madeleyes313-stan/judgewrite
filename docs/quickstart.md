# JudgeWrite Quickstart

## 目录说明
- `apps/web`：React Web 原型
- `apps/api`：FastAPI 服务
- `packages/core`：共享 Prompt、编排器、数据模型
- `packages/sdk`：Python HTTP SDK
- `data/demo`：演示卷宗、风格画像、RAG mock 数据

## 启动 API
```bash
cd "/Users/modelbest/work/own judgement"
python3 -m venv .venv
source .venv/bin/activate
pip install -r apps/api/requirements.txt
pip install -e packages/core
uvicorn apps.api.app.main:app --reload
```

## 启动 Web
```bash
cd "/Users/modelbest/work/own judgement"
npm install
npm run web:dev
```

## SDK 使用示例
```python
from judgewrite_sdk import JudgeWriteClient

client = JudgeWriteClient("http://127.0.0.1:8000")
upload = client.upload_case(["data/demo/cases/case_001.txt"])
result = client.generate_document(upload["case_id"], "judge_zhang")
print(result["draft"])
```

## 上传文件格式
- 支持 `.txt`、`.md`、`.pdf`
- 上传 PDF 时，API 会自动抽取文本并转换为内部可解析文本
- 如果 PDF 为扫描件且未包含文本层，建议先做 OCR，再上传

## OpenAI 接入
如需将 mock LLM 切换为在线模型，可设置以下环境变量：
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_BASE_URL`（可选）

未设置时系统默认使用内置 mock 生成器，确保原型离线也能跑通。
