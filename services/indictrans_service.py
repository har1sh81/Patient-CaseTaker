"""
Local IndicTrans2 Translation Microservice for MediKiosk

Environment: C:\AI\MediKiosk\indictrans-env
Model Path:  C:\AI\Models\IndicTrans2 (ai4bharat/indictrans2-indic-en-dist-200M)
Host:        http://127.0.0.1:8000
Endpoints:
  GET  /health
  POST /translate
"""

import os
import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

# Force UTF-8 output encoding for Windows terminal output
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from IndicTransToolkit import IndicProcessor

MODEL_DIR = os.environ.get('INDICTRANS_MODEL_DIR', r'C:\AI\Models\IndicTrans2')
PORT = int(os.environ.get('INDICTRANS_PORT', '8000'))

print(f"[IndicTrans2 Service] Initializing IndicTrans2 from: {MODEL_DIR}")
print("[IndicTrans2 Service] Loading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR, trust_remote_code=True)

print("[IndicTrans2 Service] Loading model...")
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_DIR, trust_remote_code=True)
model.eval()

print("[IndicTrans2 Service] Initializing IndicProcessor...")
ip = IndicProcessor(inference=True)

print("[IndicTrans2 Service] Model ready for inference!")


def translate_text(text: str, src_lang: str, tgt_lang: str = 'eng_Latn') -> str:
    """Translates text from src_lang to tgt_lang using IndicTrans2."""
    if not text or not text.strip():
        return ""
    
    # If source and target are the same, return as is
    if src_lang == tgt_lang:
        return text

    batch = ip.preprocess_batch([text], src_lang=src_lang, tgt_lang=tgt_lang)
    inputs = tokenizer(batch, truncation=True, padding='longest', return_tensors='pt')

    with torch.inference_mode():
        outputs = model.generate(**inputs, num_beams=1, max_length=128)

    decoded = tokenizer.batch_decode(outputs, skip_special_tokens=True)
    translations = ip.postprocess_batch(decoded, lang=tgt_lang)
    return translations[0]


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in a separate thread for concurrent requests."""
    daemon_threads = True


class TranslationRequestHandler(BaseHTTPRequestHandler):

    def _send_json(self, status_code: int, payload: dict):
        try:
            response_data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
            self.send_response(status_code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(response_data)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            self.wfile.write(response_data)
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError, OSError):
            pass

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/health' or self.path == '/':
            self._send_json(200, {
                'status': 'healthy',
                'service': 'MediKiosk Local IndicTrans2 Service',
                'model': 'ai4bharat/indictrans2-indic-en-dist-200M',
                'model_dir': MODEL_DIR
            })
        else:
            self._send_json(404, {'error': 'Not found'})

    def do_POST(self):
        if self.path != '/translate':
            self._send_json(404, {'error': 'Not found'})
            return

        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            self._send_json(400, {'error': 'Empty request body'})
            return

        body_bytes = self.rfile.read(content_length)
        try:
            body = json.loads(body_bytes.decode('utf-8'))
        except json.JSONDecodeError:
            self._send_json(400, {'error': 'Invalid JSON body'})
            return

        patient_text = body.get('patientText') or body.get('text') or ''
        src_lang = body.get('sourceLanguage') or body.get('src_lang') or 'tam_Taml'
        tgt_lang = body.get('targetLanguage') or body.get('tgt_lang') or 'eng_Latn'

        if not patient_text.strip():
            self._send_json(400, {'error': 'patientText cannot be empty'})
            return

        try:
            translated = translate_text(patient_text, src_lang=src_lang, tgt_lang=tgt_lang)
            self._send_json(200, {
                'success': True,
                'sourceLanguage': src_lang,
                'targetLanguage': tgt_lang,
                'originalText': patient_text,
                'translatedText': translated,
                'modelUsed': 'ai4bharat/indictrans2-indic-en-dist-200M'
            })
        except Exception as e:
            print(f"[IndicTrans2 Service Error] {e}")
            self._send_json(500, {
                'success': False,
                'error': str(e)
            })

    def log_message(self, format, *args):
        sys.stdout.write(f"[IndicTrans2 HTTP] {format % args}\n")
        sys.stdout.flush()


def main():
    server_address = ('127.0.0.1', PORT)
    httpd = ThreadingHTTPServer(server_address, TranslationRequestHandler)
    print(f"[IndicTrans2 Service] Server listening on http://127.0.0.1:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[IndicTrans2 Service] Shutting down server...")
        httpd.server_close()


if __name__ == '__main__':
    main()
