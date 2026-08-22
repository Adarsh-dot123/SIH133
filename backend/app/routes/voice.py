from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from gtts import gTTS
import io

router = APIRouter(prefix="/voice", tags=["Voice Services"])

class TTSRequest(BaseModel):
    text: str
    lang: str = "hi" # supports "hi", "ta", "te", "bn", "mr", "en"

@router.post("/synthesize")
async def synthesize_speech(req: TTSRequest):
    try:
        # Map language codes cleanly
        lang_code = req.lang.lower()[:2]
        supported = ["hi", "ta", "te", "bn", "mr", "en", "kn", "gu"]
        if lang_code not in supported:
            lang_code = "en"

        mp3_fp = io.BytesIO()
        tts = gTTS(text=req.text, lang=lang_code, slow=False)
        tts.write_to_fp(mp3_fp)
        mp3_fp.seek(0)

        return StreamingResponse(mp3_fp, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
