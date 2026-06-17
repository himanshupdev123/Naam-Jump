// 1. Initialize the game engine
kaboom({
    background: [240, 157, 34]
});

// Soft gravity
setGravity(300);

// Global variables
let audioContext;
let analyser;
let microphone;
let dataArray;
let highScore = 0; 

// 2. Setup microphone
async function setupAudio() {
    try {
        // Disabling mobile audio enhancements prevents the mic from auto-boosting silence
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: false,
                autoGainControl: false,
                noiseSuppression: false
            } 
        });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        analyser.fftSize = 256;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        document.getElementById('start-menu').style.display = 'none';
        go("game"); 
    } catch (err) {
        console.error("Microphone error:", err);
        alert("We need microphone access to play!");
    }
}

document.getElementById('start-btn').addEventListener('click', setupAudio);

// 3. The Main Game Scene
scene("game", () => {
    let score = 0; 
    let isChanting = false; // <-- OUR NEW "BREATH DETECTOR" SWITCH
    let lastVolume = 0; 
    let timeSinceLastChant = 0;

    // The Player
    const player = add([
        rect(40, 40),
       pos(width() / 2.5, height() * 0.2),
        area(),
        body(),
        color(255, 100, 100)
    ]);

    // The Floor
    add([
        rect(width(), 48),
        pos(0, height() - 48),
        outline(4),
        area(),
        body({ isStatic: true }),
        color(100, 200, 100),
        "ground" 
    ]);
    // The Ceiling (An invisible solid boundary just above the screen)
    add([
        rect(width(), 50),
        pos(0, -50), // Positioned so its bottom edge rests exactly at the top of the screen
        area(),
        body({ isStatic: true }) // isStatic means the player will bump into it and stop
    ]);
  // --- THE NEW SKY LIMIT LINE ---
    add([
        rect(width(), 10), 
        pos(0, 65),        // Moved down slightly to 65 to fit the text above it
        area(),
        body({ isStatic: true }), 
        color(255, 255, 255)      
    ]);

    // UI: Current Score Text (Smaller & Top-Left)
    const scoreText = add([
        text("Naam Japs: 0", { size: 26 }), // Reduced size for mobile
        pos(16, 12),                        // Placed near the top-left corner
        color(255, 255, 255) 
    ]);

    // UI: High Score Text (Smaller & Top-Left)
    const highScoreText = add([
        text("High Score: " + highScore, { size: 16 }), 
        pos(16, 42),                        // Tucked right under the main score
        color(0, 0, 0) 
    ]);

    // 4. Game Loop
    onUpdate(() => {
        if (!analyser) return;

        // Calculate Volume
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        let averageVolume = sum / dataArray.length;

        // --- THE NEW SCORING LOGIC ---
        
        // If volume is high enough to trigger a jump...
      /*  if (averageVolume > 18) {
            player.jump(250); // Keep them floating
            
            // If they weren't already chanting, this is a NEW chant!
            if (!isChanting) {
                isChanting = true; // Flip the switch
                score += 1;        // Add exactly 1 point
                scoreText.text = "Naam Japs: " + score; // Update the screen
            }
        } 
        // If the volume drops low (they stopped to take a breath)...
        else if (averageVolume < 12) {
            isChanting = false; // Reset the switch so the NEXT name counts!
        }*/
       // --- UPGRADED SCORING LOGIC ---
        timeSinceLastChant += dt(); // Tracks time passing
        let volumeSpike = averageVolume - lastVolume; // Checks for sudden jumps in volume

        if (averageVolume > 10) {
             player.jump(250);
          /*  // Safe flight logic (prevents disappearing glitch)
            if (player.pos.y > 65) {
                player.vel.y = -250; 
            } else {
                player.vel.y = 0; 
            }*/
            
            // CONDITION 1: Fresh chant after a pause
            if (!isChanting) {
                isChanting = true; 
                score += 1;        
                scoreText.text = "Naam Japs: " + score; 
                timeSinceLastChant = 0; // Reset timer
            }
            // CONDITION 2: Continuous chanting ("Ram Ram Ram")
            else if (volumeSpike > 3 && timeSinceLastChant > 0.25) {
                score += 1;
                scoreText.text = "Naam Japs: " + score;
                timeSinceLastChant = 0; // Reset timer
            }
        } 
        else if (averageVolume < 8) {
            isChanting = false; // Reset switch
        }

        // Save current volume to compare against the next frame
        lastVolume = averageVolume;

       
    });

    // 5. Game Over Logic
    player.onCollide("ground", () => {
        if (score > highScore) {
            highScore = score;
        }
        go("gameover", score); 
    });
});

// 6. The Game Over Scene
scene("gameover", (finalScore) => {
    add([
        text("Oops! You stopped chanting.\n\nTotal Japs: " + finalScore + "(Approx)"+"\nHigh Score: " + highScore + "(Approx)", { size: 40, align: "center" }),
        pos(width() / 2, height() / 2 - 50),
        anchor("center")
    ]);

    add([
        text("Click anywhere or press SPACE to Chant Again!", { size: 24 }),
        pos(width() / 2, height() / 2 + 100),
        anchor("center"),
        color(150, 150, 255)
    ]);

    onClick(() => go("game"));
    onKeyPress("space", () => go("game"));
});
