# Solace Image Viewer

This React application connects to a Solace broker and displays images published to the `solace/images/>` topic. It's designed to work with the image publisher script in the parent directory.

## Features

- Real-time display of images published to Solace
- Manual connection control (connect/disconnect)
- Material UI-based responsive interface
- Connection configuration panel
- Persistent configuration via localStorage
- Displays image metadata including filename and content type

## Prerequisites

- Node.js 14+ and npm
- Running Solace broker (local or remote)
- Access to a Solace broker with WebSocket support

## Installation

1. Install dependencies:

```bash
cd demo
npm install
```

## Configuration

The application provides a user interface for configuration. Click on the "Solace Connection" panel to expand it and configure:

- URL: The WebSocket URL of your Solace broker
- VPN: Your Solace message VPN
- Username: Authentication username
- Password: Authentication password
- Topic: The topic to subscribe to (default: `solace/images/>`)

These settings are persisted in your browser's localStorage.

Environment variables can also be used for initial configuration:

```
REACT_APP_SOLACE_HOST=ws://localhost:8008
REACT_APP_SOLACE_VPN=default
REACT_APP_SOLACE_USERNAME=default
REACT_APP_SOLACE_PASSWORD=default
REACT_APP_SOLACE_TOPIC=solace/images/>
```

## Running the Application

Start the development server:

```bash
npm start
```

This will start the application on http://localhost:3000

## Complete Example Workflow

Here's a complete workflow example to test the entire system:

1. **Start a Solace broker**:
   - If you have Docker, you can run:
   ```bash
   docker run -d -p 8080:8080 -p 55555:55555 -p 8000:8000 -p 1883:1883 -p 8008:8008 -p 9000:9000 -p 2222:2222 --shm-size=2g --env username_admin_globalaccesslevel=admin --env username_admin_password=admin --name=solace solace/solace-pubsub-standard
   ```
   - Or use a Solace Cloud service

2. **Add some test images**:
   - Place some test images in the `images` directory:
   ```bash
   cp /path/to/your/images/*.jpg ../images/
   ```

3. **Run the image publisher**:
   - From the parent directory:
   ```bash
   python image_publisher.py --host=tcp://localhost:55555
   ```

4. **Start the viewer application**:
   ```bash
   npm start
   ```

5. **View the results**:
   - Open http://localhost:3000 in your browser
   - Click the "Solace Connection" panel to expand it
   - Configure connection settings if needed
   - Click the "Connect" button to connect to the Solace broker
   - You should see the images appearing in real-time
   - Try adding more images to the `images` directory and run the publisher again

## Customizing for Production

For production deployment:

1. Build the application:
```bash
npm run build
```

2. Deploy the contents of the `build` directory to your web server

3. Configure your production environment variables accordingly

## How it Works

1. The application connects to the Solace broker using the solclientjs library
2. It subscribes to the `solace/images/>` topic to receive all image messages
3. When a message is received, the base64-encoded image data is extracted and displayed
4. Images are shown in a responsive grid of cards with their metadata

## Troubleshooting

- If no connection can be established, check that your Solace broker is running and accessible
- Ensure the correct connection parameters (URL, VPN, credentials) are configured
- Check browser console for any error messages
- Verify that the image publisher script is properly publishing to the correct topic
- For WebSocket connections, ensure your Solace broker has WebSocket service enabled (typically port 8008)
