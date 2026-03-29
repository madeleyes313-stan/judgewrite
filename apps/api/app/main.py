from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


ROOT = Path(__file__).resolve().parents[3]
CORE_SRC = ROOT / "packages" / "core" / "src"
if str(CORE_SRC) not in sys.path:
    sys.path.insert(0, str(CORE_SRC))

from .config import get_cors_origins  # noqa: E402
from .routers.cases import router as cases_router  # noqa: E402

CORS_ORIGINS = get_cors_origins()

app = FastAPI(
    title="JudgeWrite API",
    version="0.1.0",
    description="法官裁判文书智能生成原型服务",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cases_router)
