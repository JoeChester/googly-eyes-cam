from autobahn.twisted.websocket import WebSocketServerProtocol
from autobahn.twisted.websocket import WebSocketServerFactory
import base64
from PIL import Image
import cv2
from io import BytesIO
import numpy as np
try:
    from cStringIO import StringIO
except:
    from StringIO import StringIO

class GooglySocketProtocol(WebSocketServerProtocol):

    def onConnect(self, request):
        print("Client connecting: {0}".format(request.peer))

    def onOpen(self):
        print("WebSocket connection open.")

    def onMessage(self, payload, isBinary):
        if isBinary:
            print("Binary message received: {0} bytes".format(len(payload)))
        else:
            print("Received Image! Length {0}".format(len(payload)))
            image_string = StringIO(base64.b64decode(payload[23:]))
            pil_image = Image.open(image_string)

            cv_img = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
            cv2.imshow("test", cv_img)
            cv2.waitKey(0)
        # echo back message verbatim
        self.sendMessage("got it!", isBinary)

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