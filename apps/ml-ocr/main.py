from fastapi import FastAPI, UploadFile
from PIL import Image
import pytesseract, io

app = FastAPI()

@app.get("/health")
def health(): return {"ok": True}

@app.post("/ocr")
async def ocr(file: UploadFile):
    img = Image.open(io.BytesIO(await file.read()))
    text = pytesseract.image_to_string(img, lang="eng")
    return {"text": text, "lang":"eng"}
