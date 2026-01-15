import cv2
import mediapipe as mp
import numpy as np

mp_face = mp.solutions.face_detection

cap = cv2.VideoCapture(0)

with mp_face.FaceDetection(
    model_selection=0,
    min_detection_confidence=0.6
) as face_detection:

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        h, w, _ = frame.shape
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        results = face_detection.process(rgb)

        if results.detections:
            print("MediaPipe face detected")
            # Take first detected face only
            detection = results.detections[0]
            bbox = detection.location_data.relative_bounding_box

            x1 = max(0, int(bbox.xmin * w))
            y1 = max(0, int(bbox.ymin * h))
            x2 = min(w, x1 + int(bbox.width * w))
            y2 = min(h, y1 + int(bbox.height * h))

            face_crop = frame[y1:y2, x1:x2]

            if face_crop.size > 0:
                cv2.imshow("Face Crop", face_crop)

        cv2.imshow("Webcam", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

cap.release()
cv2.destroyAllWindows()
