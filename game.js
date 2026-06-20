// 1. Initialize the game engine
kaboom({
    background: [240, 157, 34]
 
});
   // Load the game over sound
loadSound("gong", "gameover.mp3");
// Soft gravity
setGravity(150);

// Global variables
let audioContext;
let analyser;
let microphone;
let dataArray;
// Check the browser's memory for a saved high score. If it's empty, start at 0.
let highScore = parseInt(localStorage.getItem('naamJumpHighScore')) || 0;

// 2. Setup microphone
// 2. Setup microphone
// 2. Setup microphone
async function setupAudio() {
    try {
        // Revert to default audio to let the phone handle the mic naturally
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // KEEP THIS: iOS still requires the mic to be explicitly "woken up"
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

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

    // --- UPGRADED SCORING LOGIC ---
        timeSinceLastChant += dt(); 
        let volumeSpike = averageVolume - lastVolume; 

        // RAISED THRESHOLD: 40 ignores the phone's auto-boosted background noise
        if (averageVolume > 40) {
            player.jump(250);
            
            // CONDITION 1: Fresh chant after a pause
            if (!isChanting) {
                isChanting = true; 
                score += 1;        
                scoreText.text = "Naam Japs: " + score; 
                timeSinceLastChant = 0; 
            }
            // CONDITION 2: Continuous chanting ("Ram Ram Ram")
            // Raised the spike required to 5 so background static doesn't trigger points
            else if (volumeSpike > 5 && timeSinceLastChant > 0.25) {
                score += 1;
                scoreText.text = "Naam Japs: " + score;
                timeSinceLastChant = 0; 
            }
        } 
        // RAISED RESET: 25 ensures the game knows you took a breath, even with AGC on
        else if (averageVolume < 25) {
            isChanting = false; 
        }

        // Save current volume to compare against the next frame
        lastVolume = averageVolume;

       
    });

    // 5. Game Over Logic
// 5. Game Over Logic
   // 5. Game Over Logic
    player.onCollide("ground", () => {
        
        // --- NEW: PLAY THE SOUND ---
        play("gong"); 
        
        if (score > highScore) {
            highScore = score; 
            localStorage.setItem('naamJumpHighScore', highScore);
        }
        
        go("gameover", score); 
    });
});

// 6. The Game Over Scene
// 6. The Game Over Scene
scene("gameover", (finalScore) => {
    // 1. The Main Score Text
    add([
        text("Oops! You stopped chanting.\n\nTotal Japs: " + finalScore + "\nHigh Score: " + highScore, { 
            size: 32,             
            width: width() - 40,  
            align: "center" 
        }),
        pos(width() / 2, height() / 2 - 80), // Pushed up slightly to make room for two buttons
        anchor("center")
    ]);

    // 2. --- NEW PLAY AGAIN BUTTON ---
    add([
        rect(200, 50, { radius: 12 }),
        pos(width() / 2, height() / 2 + 40),
        anchor("center"),
        color(100, 150, 255),                // A nice calm blue
        area(),
        "play-btn"                           // Tagged specifically as the play button
    ]);

    add([
        text("Play Again", { size: 20 }),
        pos(width() / 2, height() / 2 + 40),
        anchor("center"),
        color(255, 255, 255)                 // White text
    ]);

    // Only restart the game if they specifically click THIS button
    onClick("play-btn", () => go("game"));


    // 3. --- SHARE SCORE BUTTON ---
    add([
        rect(200, 50, { radius: 12 }),
        pos(width() / 2, height() / 2 + 110), // Placed neatly below the Play button
        anchor("center"),
        color(100, 200, 100),                 // WhatsApp-style green
        area(),
        "share-btn"                           // Tagged specifically as the share button
    ]);

    add([
        text("Share Score", { size: 20 }),
        pos(width() / 2, height() / 2 + 110),
        anchor("center"),
        color(0, 0, 0)                        // Black text
    ]);

    // Triggers your phone's native sharing menu
    onClick("share-btn", () => {
        if (navigator.share) {
            navigator.share({
                title: 'Naam Jump',
                text: 'I just scored ' + finalScore + ' Japs on Naam Jump! Can you beat my high score of ' + highScore + '?',
                url: window.location.href, 
            })
            .catch((error) => console.log('Error sharing:', error));
        } else {
            alert('Your browser does not support sharing.');
        }
    });

    // We can keep the spacebar shortcut active for laptop users!
    onKeyPress("space", () => go("game"));
});
