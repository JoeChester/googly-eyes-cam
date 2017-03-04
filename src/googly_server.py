from autobahn.twisted.websocket import WebSocketServerProtocol
from autobahn.twisted.websocket import WebSocketServerFactory
import base64
from PIL import Image
import cv2
from io import BytesIO
import numpy as np
import simplejson as json
try:
    from cStringIO import StringIO
except:
    from StringIO import StringIO
from datetime import datetime


face_cascade = cv2.CascadeClassifier('haarcascade_frontalface_default.xml')
eye_cascade = cv2.CascadeClassifier('haarcascade_eye.xml')

class GooglySocketProtocol(WebSocketServerProtocol):

    def onConnect(self, request):
        print("Client connecting: {0}".format(request.peer))

    def onOpen(self):
        print("WebSocket connection open.")

    def onMessage(self, payload, isBinary):
        if isBinary:
            print("Binary message received: {0} bytes".format(len(payload)))
        else:
            print("Picture Received!")
            image_string = StringIO(base64.b64decode(payload[23:]))
            pil_image = Image.open(image_string)

            cv_img = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.3, 5)

            allEyes = []

            for (x,y,w,h) in faces:
                #cv2.rectangle(cv_img,(x,y),(x+w,y+h),(255,0,0),2)
                roi_gray = gray[y:y+h, x:x+w]
                roi_color = cv_img[y:y+h, x:x+w]
                eyes = eye_cascade.detectMultiScale(roi_gray)
                for(ex, ey, ew, eh) in eyes:
                    eyeDict = {"x":x, "y":y, "w":w, "h":h,
                    "ex": ex, "ey": ey, "ew": ew, "eh": eh}
                    allEyes.append(eyeDict)        
                    #cv2.rectangle(roi_color,(ex,ey),(ex+ew,ey+eh),(0,255,0),2)
    
            eyesDto = json.dumps(allEyes)
            self.sendMessage(eyesDto)

        #self.sendMessage("got it!", isBinary)

    def onClose(self, wasClean, code, reason):
        print("WebSocket connection closed: {0}".format(reason))


if __name__ == '__main__':

    import sys

    from twisted.python import log
    from twisted.internet import reactor

    log.startLogging(sys.stdout)

    factory = WebSocketServerFactory(u"ws://127.0.0.1:9000")
    factory.protocol = GooglySocketProtocol
    # factory.setProtocolOptions(maxConnections=2)

    # note to self: if using putChild, the child must be bytes...

    reactor.listenTCP(9000, factory)
    reactor.run()