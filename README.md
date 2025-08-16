# Decibel Meter Web Application

A full-screen web application for displaying real-time decibel measurements from Room EQ Wizard (REW) with an analog-style meter interface.

## Features

- **Full-screen analog meter display** with animated needle and progress arc
- **Real-time SPL readings** from REW API (40-100 dB range)
- **Average calculation** between two user-defined points
- **Keyboard control** - Press SPACE to start/stop recording for average calculation
- **Color-coded levels** - Safe (green), Moderate (yellow), High (orange), Dangerous (red)
- **Modern responsive design** with smooth animations
- **Error handling** and connection status indicators

## Prerequisites

- Room EQ Wizard (REW) installed and running
- REW API enabled on port 4735 (default)
- Modern web browser with JavaScript enabled
- Audio input device connected to your system

## Setup

### Run the Python Web Server

- **Normal mode:**  
  `python server.py`

- **Demo mode (serves fake REW API data on port 8081):**  
  `python server.py --demo`

  - The main web server runs on port 8080.
  - The demo REW API server runs on port 8081 and responds to `/rew/api/levels` with mock SPL data:
    ```json
    {
      "level": 70.5,
      "peak": 85.0,
      "rms": 68.2
    }
    ```

1. **Start REW with API enabled:**
   - On Windows: `"C:\Program Files\REW\roomeqwizard.exe" -api`
   - On macOS: `open -a REW.app --args -api`
   - Or use the API button in REW preferences

2. **Open the web application:**
   - Open `index.html` in your web browser
   - For demo mode (without REW): `index.html?demo=true`

3. **Connect and use:**
   - Click "Connect to REW" button
   - The meter will start displaying real-time SPL readings
   - Press SPACE to start/stop recording for average calculations

## Usage

### Basic Operation
- The meter automatically displays current SPL readings from REW
- Needle and arc progress indicate the current decibel level
- Digital display shows precise numerical values

### Recording Averages
1. Press **SPACE** to start recording
2. Recording indicator will turn red and pulse
3. Press **SPACE** again to stop recording
4. Average of recorded values will be displayed

### Color Coding
- **Green (0-60 dB)**: Safe levels
- **Yellow (60-75 dB)**: Moderate levels  
- **Orange (75-90 dB)**: High levels
- **Red (90+ dB)**: Dangerous levels

## Architecture

The application follows modern web development best practices:

### HTML Structure
- Semantic HTML5 with proper accessibility considerations
- SVG-based meter for scalable vector graphics
- Responsive viewport configuration

### CSS Architecture
- CSS Grid and Flexbox for layout
- CSS custom properties for theming
- Responsive design with media queries
- Hardware-accelerated animations using transforms
- CSS gradients and filters for visual effects

### JavaScript Architecture
- ES6+ class-based architecture
- Async/await for API calls
- Event-driven programming
- Error handling and graceful degradation
- Modular design with separation of concerns

### Key Classes and Methods

#### `DecibelMeter` Class
- `connect()` - Establishes connection to REW API
- `startSplMeter()` - Configures and starts REW SPL meter
- `startPolling()` - Polls for real-time SPL data
- `toggleRecording()` - Handles recording state for averages
- `updateDisplay()` - Updates all visual elements
- `dbToAngle()` - Converts dB values to needle angles

## API Integration

The application integrates with the Room EQ Wizard API:

### Endpoints Used
- `GET /application` - Health check and connection test
- `PUT /spl-meter/1/configuration` - Configure SPL meter settings
- `POST /spl-meter/1/command` - Start/stop SPL meter
- `GET /spl-meter/1/levels` - Retrieve current SPL readings

### Configuration
```javascript
{
  mode: 'SPL',
  weighting: 'C',
  filter: 'Fast',
  highPassActive: false,
  rollingLeqActive: false
}
```

## Files Structure

```
├── index.html          # Main HTML structure
├── styles.css          # Styling and animations
├── app.js             # JavaScript application logic
└── README.md          # Documentation
```

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Troubleshooting

### Connection Issues
1. Ensure REW is running and API is enabled
2. Check that REW API is on port 4735 (default)
3. Verify no firewall is blocking localhost connections
4. Try demo mode to test the interface: `index.html?demo=true`

### Performance Issues
1. Close unnecessary browser tabs
2. Check that your system has adequate resources
3. Ensure audio drivers are properly installed

### Display Issues
1. Ensure JavaScript is enabled in your browser
2. Try refreshing the page (F5 or Ctrl+R)
3. Check browser developer console for errors (F12)

## Development

To modify or extend the application:

1. **Add new features:** Extend the `DecibelMeter` class
2. **Styling changes:** Modify `styles.css` with CSS custom properties
3. **Layout changes:** Update the HTML structure in `index.html`

### Adding New Meter Types
The application can be extended to support other REW meter types by modifying the API configuration in `startSplMeter()` method.

## License

This project is open source. Feel free to modify and distribute according to your needs.
