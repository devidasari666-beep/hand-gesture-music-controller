const video = document.getElementById("video");
const button = document.getElementById("enablecam");
const gestureText = document.getElementById("gesture");

let detector = null;
let lastGesture = "";
let candidate = "";
let candidateCount = 0;


let kick = null;
let tom = null;
let bass = null;
let snare = null;
let synth = null;
let hiHat = null;

function playSound(gesture) {
    if (gesture === "Fist")  bass.triggerAttackRelease("C2", "8n");
    if (gesture === "Index") kick.triggerAttackRelease("C1", "8n");
    if (gesture === "Peace") snare.triggerAttackRelease("8n");
    if (gesture === "Rock")  synth.triggerAttackRelease("C4", "8n");
    if (gesture === "Palm")  hiHat.triggerAttackRelease("32n");
    if (gesture === "Thumb") tom.triggerAttackRelease("G2", "8n");
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function fingerState(points, tip, knuckle) {
    const wrist = points[0];
    const ratio = distance(points[tip], wrist) / distance(points[knuckle], wrist);
    if (ratio > 1.6) return "up";
    if (ratio < 1.25) return "down";
    return "half";
}

function thumbState(points) {
    const palmSize = distance(points[0], points[9]);
    const ratio = distance(points[4], points[5]) / palmSize;
    if (ratio > 0.75) return "up";
    if (ratio < 0.55) return "down";
    return "half";
}

function getGesture(points) {
    const thumb  = thumbState(points);
    const index  = fingerState(points, 8, 5);
    const middle = fingerState(points, 12, 9);
    const ring   = fingerState(points, 16, 13);
    const pinky  = fingerState(points, 20, 17);

    if (
        index === "half" || middle === "half" ||
        ring === "half" || pinky === "half"
    ) {
        return "None";
    }

    const i = index === "up";
    const m = middle === "up";
    const r = ring === "up";
    const p = pinky === "up";

    if (i && m && r && p)    return "Palm";
    if (i && m && !r && !p)  return "Peace";
    if (i && !m && !r && p)  return "Rock";

    if (!m && !r && !p) {
        if (i && thumb === "up") return "Gun";  // index + thumb
        if (i)                   return "Index";
        if (thumb === "up")      return "Thumb";
        if (thumb === "down")    return "Fist";
    }

    return "None";
}

async function detect() {
    const hands = await detector.estimateHands(video);

    let gesture = "None";

    if (hands.length > 0) {
        gesture = getGesture(hands[0].keypoints);
    }

    gestureText.textContent = "Gesture: " + gesture;

    if (gesture === candidate) {
        candidateCount++;
    } else {
        candidate = gesture;
        candidateCount = 1;
    }

    if (candidateCount >= 5) {
        if (gesture === "None") {
            lastGesture = "";
        } else if (gesture !== lastGesture) {
            playSound(gesture);
            lastGesture = gesture;
        }
    }

    requestAnimationFrame(detect);
}

async function start() {
    // Unlock audio — must happen on user click
    await Tone.start();

    // Create instruments after audio is unlocked
    kick  = new Tone.MembraneSynth().toDestination();
    tom   = new Tone.MembraneSynth().toDestination();
    bass  = new Tone.MonoSynth().toDestination();
    snare = new Tone.NoiseSynth().toDestination();
    synth = new Tone.Synth().toDestination();
    hiHat = new Tone.MetalSynth().toDestination();

    // Start webcam
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    await video.play();

    button.style.display = "none";

    // Start detection
    detect();
}

async function init() {
    gestureText.textContent = "Loading model...";

    detector = await handPoseDetection.createDetector(
        handPoseDetection.SupportedModels.MediaPipeHands,
        {
            runtime: "mediapipe",
            solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
            modelType: "full",
            maxHands: 1
        }
    );

    gestureText.textContent = "Click Enable Camera";
    button.addEventListener("click", start);
}

init();