// popup.js
const moodeUrl = 'http://moode.local';

// Core Functions
async function play() {
    try {
        const response = await fetch(`${moodeUrl}/command/?cmd=play`);
        return response.status === 200;
    } catch (error) {
        console.error('Error playing:', error);
        return false;
    }
}

async function stop() {
    try {
        const response = await fetch(`${moodeUrl}/command/?cmd=pause`);
        return response.status === 200;
    } catch (error) {
        console.error('Error stopping:', error);
        return false;
    }
}

async function getCurrentTrack() {
    try {
        const response = await fetch(`${moodeUrl}/engine-mpd.php?state=undefined`);
        if (!response.ok) throw new Error('Failed to get current track');
        const data = await response.json();
        return data.title || 'Not Playing';
    } catch (error) {
        console.error('Error getting current track:', error);
        return 'Not Playing';
    }
}

async function getVolume() {
    try {
        const response = await fetch(`${moodeUrl}/command/?cmd=status`);
        if (!response.ok) throw new Error('Failed to get volume');
        const data = await response.json();
        
        const volumeStr = data["0"];
        const volumeMatch = volumeStr.match(/volume:\s*(\d+)/);
        const volume = volumeMatch ? parseInt(volumeMatch[1]) : 0;
        
        console.log('Current volume:', volume);
        return volume;
    } catch (error) {
        console.error('Error getting volume:', error);
        return 0;
    }
}

async function setVolume(newVolume) {
    try {
        const formData = new URLSearchParams();
        formData.append('volknob', newVolume);
        formData.append('event', 'knob_change');

        const response = await fetch(`${moodeUrl}/command/playback.php?cmd=upd_volume`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData
        });

        if (!response.ok) throw new Error('Failed to set volume');
        updateVolumeDisplay(newVolume);
        return true;
    } catch (error) {
        console.error('Error setting volume:', error);
        return false;
    }
}

async function getState() {
    try {
        const response = await fetch(`${moodeUrl}/command/?cmd=status`);
        if (!response.ok) throw new Error('Failed to get state');
        const data = await response.json();
        const playState = data["9"].split(': ')[1]; // "state: play/stop"
        const trackName = await getCurrentTrack();
        
        return {
            state: playState,
            title: trackName
        };
    } catch (error) {
        console.error('Error getting state:', error);
        return null;
    }
}

// Control Functions
async function adjustVolume(direction) {
    try {
        const currentVolume = await getVolume();
        console.log('Current volume before adjustment:', currentVolume);
        
        let newVolume;
        if (direction === 'up') {
            newVolume = Math.min(currentVolume + 5, 100);
        } else {
            newVolume = Math.max(currentVolume - 5, 0);
        }
        
        console.log('Setting new volume to:', newVolume);
        await setVolume(newVolume);
        
        // Verify the new volume after setting
        const verifiedVolume = await getVolume();
        console.log('Volume verified as:', verifiedVolume);
        updateVolumeDisplay(verifiedVolume);
    } catch (error) {
        console.error('Error adjusting volume:', error);
    }
}

async function togglePlay() {
    const state = await getState();
    if (state && state.state === 'play') {
        await stop();
    } else {
        await play();
    }
    updateState();
}

// UI Update Functions
async function updateState() {
    const state = await getState();
    const volume = await getVolume();
    
    if (state) {
        document.getElementById('currentTrack').textContent = state.title;
        document.getElementById('playPause').textContent = 
            state.state === 'play' ? '⏸' : '▶️';
        updateVolumeDisplay(volume);
    }
}

function updateVolumeDisplay(volume) {
    const volumeElement = document.getElementById('volume');
    if (volumeElement) {
        volumeElement.textContent = `Volume: ${volume}`;
        console.log('Display updated with volume:', volume);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Control button listeners
    document.getElementById('playPause').addEventListener('click', togglePlay);
    document.getElementById('next').addEventListener('click', async () => {
        await fetch(`${moodeUrl}/command/?cmd=next`);
        updateState();
    });
    document.getElementById('prev').addEventListener('click', async () => {
        await fetch(`${moodeUrl}/command/?cmd=previous`);
        updateState();
    });
    document.getElementById('volumeUp').addEventListener('click', () => adjustVolume('up'));
    document.getElementById('volumeDown').addEventListener('click', () => adjustVolume('down'));

    // Initial update
    updateState();

    // Update state every 2 seconds
    setInterval(updateState, 2000);
});
