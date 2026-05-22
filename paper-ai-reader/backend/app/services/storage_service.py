from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
import re
from uuid import uuid4

from fastapi import UploadFile

from app.core.config import get_settings
from app.core.paths import ensure_data_dirs


@dataclass(frozen=True)
class SavedFile:
    path: Path
    file_name: str
    file_hash: str
    size: int


def safe_filename(file_name: str) -> str:
    clean_name = re.sub(r"[^A-Za-z0-9._ -]+", "_", file_name).strip()
    return clean_name or "paper.pdf"


async def save_uploaded_paper(upload: UploadFile) -> SavedFile:
    ensure_data_dirs()
    settings = get_settings()
    original_name = safe_filename(upload.filename or "paper.pdf")
    temp_path = settings.cache_dir / f"upload-{uuid4().hex}.tmp"
    digest = sha256()
    total_size = 0

    with temp_path.open("wb") as buffer:
        while True:
            chunk = await upload.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
            total_size += len(chunk)
            buffer.write(chunk)

    file_hash = digest.hexdigest()
    target_path = settings.paper_dir / f"{file_hash[:12]}-{original_name}"
    if target_path.exists():
        temp_path.unlink(missing_ok=True)
    else:
        temp_path.replace(target_path)

    return SavedFile(
        path=target_path,
        file_name=original_name,
        file_hash=file_hash,
        size=total_size,
    )
