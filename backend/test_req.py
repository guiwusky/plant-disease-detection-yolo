import requests
import io
from PIL import Image

img = Image.new('RGB', (100, 100))
buf = io.BytesIO()
img.save(buf, format='JPEG')

try:
    res = requests.post('http://localhost:8000/detect', files={'file': ('test.jpg', buf.getvalue(), 'image/jpeg')})
    print(res.status_code)
    print(res.text)
except Exception as e:
    print(e)
