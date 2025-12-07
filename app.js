// app.js

gsap.registerPlugin(ScrollTrigger);

// --- SMILE GATE CONFIGURATION ---
const SMILE_THRESHOLD = 50; 
const SMILE_CONFIRM_FRAMES = 5; 
const MOUTH_LEFT_INDEX = 61;
const MOUTH_RIGHT_INDEX = 291;

let model;
let video;
let photoCanvas;
let photoContext;
let smileCount = 0;
let isUnlocked = false;

// --- UTILITY FUNCTION ---
function getDistance(p1, p2) {
    if (!p1 || !p2) return 0;
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    return Math.sqrt(dx * dx + dy * dy);
}

// --- LOGIC: SMILE DETECTION LOOP ---
async function detectFaces() {
    if (!model || !video.readyState) {
        requestAnimationFrame(detectFaces);
        return;
    }

    const faces = await model.estimateFaces(video);
    
    if (faces.length > 0 && !isUnlocked) {
        const landmarks = faces[0].mesh;
        const leftMouth = landmarks[MOUTH_LEFT_INDEX];
        const rightMouth = landmarks[MOUTH_RIGHT_INDEX];
        const mouthDistance = getDistance(leftMouth, rightMouth);

        document.getElementById('status-message').innerText = 
            `Distance: ${mouthDistance.toFixed(2)}. Smile wider!`;

        if (mouthDistance > SMILE_THRESHOLD) {
            smileCount++;
            if (smileCount >= SMILE_CONFIRM_FRAMES) {
                unlockPortfolio();
                return; 
            }
        } else {
            smileCount = 0;
        }
    }
    
    if (!isUnlocked) {
        requestAnimationFrame(detectFaces);
    }
}

// --- LOGIC: UNLOCK SEQUENCE (With Photo Capture and Stamp) ---
function unlockPortfolio() {
    if (isUnlocked) return;
    isUnlocked = true;
    
    // 1. Capture the photo frame onto the canvas
    if (video && photoContext && photoCanvas) {
        photoCanvas.width = video.videoWidth;
        photoCanvas.height = video.videoHeight;
        photoContext.drawImage(video, 0, 0, photoCanvas.width, photoCanvas.height);
    }
    
    // Stop video stream
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }

    document.getElementById('status-message').innerText = "Snap! 100% REAL!";

    // GSAP Timeline for the full sequence
    gsap.timeline()
        // 2. Photo appears and "prints out"
        .set(photoCanvas, { visibility: "visible" }) 
        .fromTo(photoCanvas, 
            { y: '50%', scale: 0.1, opacity: 0 }, 
            { y: '0%', scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.7)" }) 
        
        // 3. Stamp Slams Down
        .set("#pass-stamp", { visibility: "visible" }, "<0.1") 
        .fromTo("#pass-stamp", 
            { scale: 3, opacity: 0, rotate: -45 }, 
            { scale: 1, opacity: 1, rotate: 0, duration: 0.3, ease: "power4.in" }) 
        
        // 4. Stamp and Photo fade out simultaneously with the gate
        .to(photoCanvas, { opacity: 0, duration: 0.5, delay: 0.7, ease: "power1.in" }) 
        .to("#pass-stamp", { opacity: 0, duration: 0.5 }, "<") 
        .to("#smile-gate-container", { opacity: 0, duration: 1, ease: "power2.inOut" }, "<0.2") 
        
        // 5. Reveal the portfolio content
        .set("#pin-wrapper", { visibility: "visible" }) 
        .to("#pin-wrapper", { opacity: 1, duration: 1, ease: "power2.inOut" }, "-=0.5") 
        .call(initializeHorizontalScroll); 
}


// --- CORE INITIALIZATION ---
async function init() {
    video = document.getElementById('webcam');
    photoCanvas = document.getElementById('captured-photo-canvas');
    if (photoCanvas) {
        photoContext = photoCanvas.getContext('2d');
    }

    try {
        document.getElementById('status-message').innerText = "Loading Machine Learning Model...";
        model = await facemesh.load({ maxFaces: 1 });
        
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
        video.srcObject = stream;

        video.onloadeddata = () => {
            document.getElementById('status-message').innerText = "Ready! Show us your best smile!";
            detectFaces();
        };

    } catch (error) {
        console.error("Camera/Model initialization failed:", error);
        document.getElementById('status-message').innerHTML = 
            `Camera Access Failed. <button onclick="unlockPortfolio()">Continue Anyway</button>`;
    }
}


// --- HORIZONTAL SCROLL LOGIC ---
function initializeHorizontalScroll() {
    const wrapper = document.getElementById("horizontal-sections-wrapper");
    const scrollDistance = wrapper.scrollWidth - window.innerWidth;

    gsap.to(wrapper, {
        x: -scrollDistance, 
        ease: "none",
        scrollTrigger: {
            trigger: "#pin-wrapper", 
            start: "top top", 
            pin: true, 
            end: `+=${scrollDistance}`, 
            scrub: 1, 
        }
    });
    ScrollTrigger.refresh();
}

// Start the entire process when the DOM is ready
document.addEventListener("DOMContentLoaded", init);