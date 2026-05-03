import tempfile
from pathlib import Path
from typing import Optional

import httpx

_model: Optional[object] = None


def _get_model():
    global _model
    if _model is None:
        from ultralytics import YOLO
        # Swap for fine-tuned model path when available (Phase 2)
        _model = YOLO("yolo11n.pt")
    return _model


async def _download_image(url: str) -> Path:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
    tmp.write(resp.content)
    tmp.close()
    return Path(tmp.name)


async def detect_damage(image_urls: list[str]) -> list[dict]:
    """
    Run YOLO on Copart lot images and return DamageObservation dicts.

    Pre-trained YOLOv11 won't output panel/damage labels — this path only
    activates once a fine-tuned model is in place. The fine-tuned model is
    expected to output class labels in "panel:damage_type" format
    (e.g. "front_bumper:crack"). Until then, use damage_observations in the
    request body to supply damage manually.
    """
    model = _get_model()
    observations = []

    for url in image_urls[:5]:  # cap to limit latency
        try:
            img_path = await _download_image(url)
            results = model(str(img_path), verbose=False)
            for result in results:
                for cls_id in result.boxes.cls.tolist():
                    label = model.names[int(cls_id)]
                    if ":" in label:
                        panel, damage_type = label.split(":", 1)
                        observations.append({"panel": panel, "damage_type": damage_type})
            img_path.unlink(missing_ok=True)
        except Exception:
            continue

    return observations
