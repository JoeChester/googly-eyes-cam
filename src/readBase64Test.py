import base64
from PIL import Image
import cv2
from io import BytesIO
import numpy as np
try:
    from cStringIO import StringIO
except:
    from StringIO import StringIO

#pil_image = Image.open(BytesIO(base64.b64decode(data)))
#pil_image.show()

image_string = StringIO(base64.b64decode(data))

pil_image = Image.open(image_string)

cv_img = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
cv2.imshow("test", cv_img)
cv2.waitKey(0)