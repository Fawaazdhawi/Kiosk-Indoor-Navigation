import io
import tempfile
import os
from loguru import logger

_whisper_model = None

def get_whisper_model(model_size: str = "base", device: str = "cpu", compute_type: str = "int8"):
    """
    Lazy loader untuk model Faster-Whisper.
    Menggunakan int8 quantization agar sangat ringan dan cepat di CPU.
    """
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            logger.info(f"[STT] Memuat model Faster-Whisper '{model_size}' (device={device}, compute_type={compute_type})...")
            _whisper_model = WhisperModel(model_size, device=device, compute_type=compute_type)
            logger.info(f"[STT] Model Faster-Whisper '{model_size}' berhasil dimuat!")
        except Exception as e:
            logger.error(f"[STT] Gagal memuat Faster-Whisper: {e}")
            raise e
    return _whisper_model


def transcribe_audio_file(file_bytes: bytes, filename: str = "audio.webm", language: str = "id") -> dict:
    """
    Mentranskripsi file audio mentah (WAV, WebM, OGG, dll) ke dalam teks bahasa Indonesia.
    """
    try:
        model = get_whisper_model()
        
        # Simpan file sementara agar dapat dibaca oleh PyAV / ctranslate2
        suffix = os.path.splitext(filename)[1] or ".webm"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        try:
            # vad_filter=True otomatis memotong keheningan/noise di awal & akhir
            segments, info = model.transcribe(
                tmp_path,
                language=language if language != "auto" else None,
                beam_size=5,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500)
            )

            transcribed_text = " ".join(seg.text for seg in segments).strip()
            logger.info(f"[STT] Hasil transkrip ({info.language}, prob={info.language_probability:.2f}): '{transcribed_text}'")

            return {
                "status": "success",
                "text": transcribed_text,
                "detected_language": info.language,
                "language_probability": float(info.language_probability)
            }
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    except Exception as e:
        logger.error(f"[STT] Kesalahan transkripsi audio: {e}")
        return {
            "status": "error",
            "text": "",
            "message": str(e)
        }
