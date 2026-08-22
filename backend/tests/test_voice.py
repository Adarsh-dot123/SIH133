from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_voice_synthesize_endpoint():
    payload = {
        "text": "Hello, this is a test of Google TTS.",
        "lang": "en"
    }
    # Mock gTTS write_to_fp to avoid network requests in sandboxed environment tests
    with patch("gtts.gTTS.write_to_fp") as mock_write:
        mock_write.side_effect = lambda fp: fp.write(b"mock_mp3_data")
        
        response = client.post("/api/voice/synthesize", json=payload)
        assert response.status_code == 200
        assert response.headers["content-type"] == "audio/mpeg"
        assert response.content == b"mock_mp3_data"
