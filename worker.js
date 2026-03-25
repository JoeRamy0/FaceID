// Face Detection Worker - Runs in background for smooth UI
importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.11.0/dist/tf.min.js');
importScripts('https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.js');

let modelsLoaded = false;
let faceapiReady = false;

// Load models in worker
async function loadModels() {
    try {
        await tf.setBackend('webgl');
        await tf.ready();
        
        const modelUrl = 'https://vladmandic.github.io/face-api/model';
        
        await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
        await faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl);
        await faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl);
        
        modelsLoaded = true;
        faceapiReady = true;
        postMessage({ type: 'ready' });
    } catch (error) {
        postMessage({ type: 'error', message: error.message });
    }
}

loadModels();

// Listen for frames from main thread
onmessage = async (event) => {
    if (!modelsLoaded) return;
    
    const { imageData } = event.data;
    
    try {
        // Convert ImageData to HTMLImageElement for face-api
        const canvas = new OffscreenCanvas(imageData.width, imageData.height);
        const ctx = canvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
        
        const detection = await faceapi.detectSingleFace(
            canvas, 
            new faceapi.TinyFaceDetectorOptions({
                inputSize: 224,
                scoreThreshold: 0.5
            })
        ).withFaceLandmarks().withFaceDescriptor();
        
        if (detection && detection.descriptor) {
            const descriptorArray = Array.from(detection.descriptor);
            postMessage({
                type: 'result',
                descriptor: descriptorArray
            });
            
            // Clean up
            if (detection.descriptor) {
                tf.dispose(detection.descriptor);
            }
        } else {
            postMessage({ type: 'no-face' });
        }
        
        canvas.close();
    } catch (error) {
        postMessage({ type: 'error', message: error.message });
    }
};