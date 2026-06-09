import React, { useEffect, useRef, useState } from 'react'
import * as faceapi from 'face-api.js'

const FaceScanner = ({ storedWorkers, onScanResult }) => {
  const videoRef = useRef(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [blinkCount, setBlinkCount] = useState(0)
  const [livenessConfirmed, setLivenessConfirmed] = useState(false)
  const [statusMessage, setStatusMessage] = useState('Initializing camera...')
  const streamRef = useRef(null)
  const scanIntervalRef = useRef(null)

  useEffect(() => {
    loadModels()
    return () => {
      stopCamera()
    }
  }, [])

  const loadModels = async () => {
    try {
      setStatusMessage('Loading face recognition models...')
      const MODEL_URL = '/models'
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ])
      setModelsLoaded(true)
      setStatusMessage('Models loaded. Starting camera...')
      startCamera()
    } catch (err) {
      setCameraError('Failed to load face recognition models: ' + err.message)
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setStatusMessage('Camera ready. Position face in frame and blink to verify liveness.')
      }
    } catch (err) {
      const messages = {
        NotAllowedError: 'Camera permission denied. Allow camera access and refresh.',
        NotFoundError: 'No camera detected. Connect a camera and refresh.',
        NotReadableError: 'Camera is in use by another application.'
      }
      setCameraError(messages[err.name] || 'Camera unavailable.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
    }
  }

  const eyeAspectRatio = (eye) => {
    const dist = (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
    const A = dist(eye[1], eye[5])
    const B = dist(eye[2], eye[4])
    const C = dist(eye[0], eye[3])
    return (A + B) / (2.0 * C)
  }

  const startScan = async () => {
    if (!modelsLoaded || !videoRef.current) return
    setScanning(true)
    setBlinkCount(0)
    setLivenessConfirmed(false)
    setStatusMessage('Scanning... please blink once to confirm liveness')

    let blinks = 0
    let eyeWasClosed = false
    const startTime = Date.now()

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current) return

      const detection = await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        setStatusMessage('No face detected. Move closer to camera.')
        return
      }

      const landmarks = detection.landmarks
      const leftEye = landmarks.getLeftEye()
      const rightEye = landmarks.getRightEye()
      const EAR = (eyeAspectRatio(leftEye) + eyeAspectRatio(rightEye)) / 2

      if (EAR < 0.25 && !eyeWasClosed) {
        eyeWasClosed = true
        blinks++
        setBlinkCount(blinks)
      } else if (EAR >= 0.25) {
        eyeWasClosed = false
      }

      if (blinks === 0 && Date.now() - startTime > 5000) {
        clearInterval(scanIntervalRef.current)
        setScanning(false)
        setStatusMessage('No blink detected. Possible printed photo. Scan rejected.')
        onScanResult({ pass: false, reason: 'Liveness check failed - no blink detected' })
        return
      }

      if (blinks >= 1) {
        clearInterval(scanIntervalRef.current)
        setLivenessConfirmed(true)
        setStatusMessage('Liveness confirmed! Matching face...')

        const liveDescriptor = Array.from(detection.descriptor)
        const confidence = matchFace(liveDescriptor)

        setScanning(false)
        onScanResult({
          pass: true,
          descriptor: liveDescriptor,
          confidence,
          livenessPass: true
        })
      }
    }, 200)
  }

  const matchFace = (liveDescriptor) => {
    if (!storedWorkers || storedWorkers.length === 0) return 0

    const labeled = storedWorkers.map(w =>
      new faceapi.LabeledFaceDescriptors(
        w._id,
        [new Float32Array(w.faceEncoding)]
      )
    )

    const matcher = new faceapi.FaceMatcher(labeled, 0.35)
    const match = matcher.findBestMatch(new Float32Array(liveDescriptor))

    return {
      workerId: match.label !== 'unknown' ? match.label : null,
      confidence: Math.round((1 - match.distance) * 100),
      matched: match.label !== 'unknown'
    }
  }

  return (
    <div>
      {cameraError && (
        <div className="alert alert-danger">{cameraError}</div>
      )}

      <div className="position-relative mb-3">
        <video
          ref={videoRef}
          autoPlay
          muted
          width="100%"
          style={{ borderRadius: '8px', background: '#000', maxHeight: '300px' }}
        />
        {!modelsLoaded && (
          <div className="position-absolute top-50 start-50 translate-middle text-white text-center">
            <div className="spinner-border text-light mb-2" />
            <p>Loading models...</p>
          </div>
        )}
      </div>

      <div className="mb-3">
        <div className={`alert ${livenessConfirmed ? 'alert-success' : 'alert-info'} py-2`}>
          {statusMessage}
        </div>
        {blinkCount > 0 && (
          <span className="badge bg-success">✅ Blink detected — liveness confirmed</span>
        )}
      </div>

      <button
        className="btn btn-success w-100"
        onClick={startScan}
        disabled={!modelsLoaded || scanning}
      >
        {scanning ? (
          <><span className="spinner-border spinner-border-sm me-2" />Scanning...</>
        ) : 'Start Face Scan'}
      </button>
    </div>
  )
}

export default FaceScanner