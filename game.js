// 1. Initialize the game engine
kaboom({
    background: [240, 157, 34]
});

// Soft gravity
setGravity(120);

// Global variables
let audioContext;
let analyser;
let microphone;
let dataArray;
let highScore = 0; 

// 2. Setup microphone
// 2. Setup microphone
// 2. Setup microphone
// 2. Setup microphone
async function setupAudio() {
    try {
        // 1. Give instant visual feedback so the user knows it's processing
        document.getElementById('start-btn').innerText = "Loading...";

        // 2. WAKE UP THE AUDIO ENGINE FIRST (Must happen instantly on click!)
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        // 3. NOW ask for the microphone (Code pauses here until they click Allow)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // 4. Connect everything together
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        analyser.fftSize = 256;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        // 5. Hide the menu and start the game!
        document.getElementById('start-menu').style.display = 'none';
        go("game"); 
        
    } catch (err) {
        console.error("Microphone error:", err);
        alert(
            "Microphone Access Blocked! 🎙️\n\n" +
            "Please check your Chrome site settings to allow Microphone access for this website."
        );
        document.getElementById('start-btn').innerText = "Mic Blocked - Read Alert";
    }
}
document.getElementById('start-btn').addEventListener('click', setupAudio);

// 3. The Main Game Scene
scene("game", () => {
    let score = 0; 
    let isChanting = false; // <-- OUR NEW "BREATH DETECTOR" SWITCH
    let lastVolume = 0; 
    let timeSinceLastChant = 0;
    let userMaxVolume = 30;

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
       // --- AUTO-CALIBRATING ENGINE ---
        timeSinceLastChant += dt(); 
        let volumeSpike = averageVolume - lastVolume; 

        // 1. Learn their voice: If they are louder than the current max, set a new max!
        if (averageVolume > userMaxVolume) {
            userMaxVolume = averageVolume;
        }

        // 2. Adapt over time: Slowly forget the max volume. 
        // If they decide to chant softer later, the game adapts downward!
        userMaxVolume -= dt() * 5; // Drops by 5 volume points every second
        if (userMaxVolume < 20) userMaxVolume = 20; // Hard limit so background silence isn't counted

        // 3. Set the thresholds dynamically based on THEIR specific phone and voice
        let jumpThreshold = userMaxVolume * 0.70;   // Trigger a jump at 70% of their normal volume
        let hoverThreshold = userMaxVolume * 0.40;  // Hover at 40%
        let breathThreshold = userMaxVolume * 0.25; // Reset the breath at 25%

        // --- DYNAMIC SCORING LOGIC ---
        
        // Notice we are now using 'jumpThreshold' instead of a hardcoded '40'
        if (averageVolume > jumpThreshold) {
            
            // CONDITION 1: Fresh chant after a pause
            if (!isChanting) {
                player.jump(150);  
                isChanting = true; 
                score += 1;        
                scoreText.text = "Naam Japs: " + score; 
                timeSinceLastChant = 0; 
            }
            // CONDITION 2: Continuous chanting ("Ram Ram Ram")
            else if (volumeSpike > 5 && timeSinceLastChant > 0.25) {
                player.jump(150);  
                score += 1;        
                scoreText.text = "Naam Japs: " + score;
                timeSinceLastChant = 0; 
            }
            else {
                // THE COAST: Now uses the dynamic hover threshold
                if (player.pos.y > 65) {
                    player.vel.y = -30; 
                } else {
                    player.vel.y = 0;
                }
            }
        } 
        // The game now knows exactly what "silence" means for their specific mic
        else if (averageVolume < breathThreshold) {
            isChanting = false; 
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
// 6. The Game Over Scene
scene("gameover", (finalScore) => {
    add([
        text("Oops! You stopped chanting.\n\nTotal Japs: " + finalScore + " (Approx)\nHigh Score: " + highScore + " (Approx)", { 
            size: 32,             // Reduced from 40 for mobile screens
            width: width() - 40,  // Tells Kaboom to wrap the text so it never goes off-screen
            align: "center" 
        }),
        pos(width() / 2, height() / 2 - 50),
        anchor("center")
    ]);

    add([
        text("Tap anywhere or press SPACE to Chant Again!", { 
            size: 20,             // Reduced from 24
            width: width() - 40,  // Keeps it inside the screen
            align: "center"
        }),
        pos(width() / 2, height() / 2 + 100),
        anchor("center"),
        color(150, 150, 255)
    ]);

    onClick(() => go("game"));
    onKeyPress("space", () => go("game"));
});
