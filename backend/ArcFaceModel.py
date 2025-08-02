import cv2
import insightface
import json
import numpy as np

class ArcFaceModel:
    def __init__(self):
        print("Loading ArcFace model...")
        self.model = self.load_model()

    def load_model(self):
        """
        Load the InsightFace model for face embedding generation.
        """
        # Correct the model path and name
        model = insightface.app.FaceAnalysis(name='buffalo_l') # Provide the directory, not the specific file
        model.prepare(ctx_id=-1)  # Use CPU (-1) or GPU (0, 1, etc.)
        return model

    def process_image_with_arcface(self, image: np.ndarray) -> np.ndarray:
        """
        Process an image using the ArcFace model to generate an embedding for the closest face.
        Args:
            image (np.ndarray): A decoded OpenCV image (BGR format).
        Returns:
            np.ndarray: The face embedding for the closest face.
        """
        if image is None:
            raise ValueError("Invalid image data.")

        # Convert BGR to RGB for InsightFace (ArcFace model)
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # Detect faces and extract embeddings
        faces = self.model.get(image_rgb)
        if not faces:
            raise ValueError("No face detected in the image.")

        # Check if there are multiple faces
        if len(faces) > 1:
            print(f"Multiple faces detected: {len(faces)}")
            # Prioritize the face with the largest bounding box (closest face to the camera)
            closest_face = max(faces, key=lambda face: face.bbox[2] * face.bbox[3])  # largest bbox
        else:
            closest_face = faces[0]

        # Extract the embedding (if available)
        embedding = closest_face.embedding

        if embedding is None:
            raise ValueError("Failed to generate face embedding.")

        # Normalize the embedding for consistent comparison
        normalized_embedding = embedding / np.linalg.norm(embedding)

        return normalized_embedding

    def compare_faces(self, registered_face: str, provided_face: list, threshold: float = 0.80) -> float:
        """
        Compare two face embeddings and return the cosine similarity score.
        Args:
            registered_face (str or list): Stored embedding as JSON string or list.
            provided_face (list): Provided embedding as a list.
            threshold (float): Match threshold, higher threshold for more strict matching.
        Returns:
            float: Cosine similarity score.
        """
        # Parse JSON safely if registered face is a string
        if isinstance(registered_face, str):
            registered_embedding = json.loads(registered_face)
        else:
            registered_embedding = registered_face

        # Convert to NumPy arrays for the calculation
        registered_embedding = np.array(registered_embedding)
        provided_face = np.array(provided_face)

        # Normalize both embeddings (important for cosine similarity)
        registered_embedding /= np.linalg.norm(registered_embedding)
        provided_face /= np.linalg.norm(provided_face)

        # Compute cosine similarity
        similarity = np.dot(registered_embedding, provided_face)
        print(f"Cosine Similarity: {similarity}")

        # Return similarity score, with security threshold
        if similarity >= threshold:
            print(f"Face authentication successful. Cosine Similarity: {similarity}")
            return similarity
        else:
            print(f"Face authentication failed. Cosine Similarity: {similarity}")
            return similarity
