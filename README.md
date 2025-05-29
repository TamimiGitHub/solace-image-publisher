# Image Publisher

A Python utility to read images from a directory, convert them to binary and base64 format, and publish them to a Solace message broker.

## Features

- Scans a directory for common image file formats (jpg, png, gif, etc.)
- Converts images to binary and base64 encoded format
- Publishes images to a Solace message broker with appropriate metadata
- Configurable via command-line arguments or environment variables
- Handles connection errors and reconnection attempts gracefully

## Prerequisites

- Python 3.6 or higher
- Solace PubSub+ broker (or Solace Cloud service)
- Python dependencies (see requirements.txt)

## Installation

1. Clone this repository or download the source code
2. Install the required dependencies:

```bash
pip install -r requirements.txt
```

## Usage

1. Create an `images` directory (if not already present) and add your image files:

```bash
mkdir images
# Add your image files to the images directory
```

2. Run the script:

```bash
python image_publisher.py
```

This will use default settings (local Solace broker, 'images' directory).

### Command Line Options

You can customize the behavior with command-line arguments:

```bash
python image_publisher.py --images-dir=/path/to/images --host=tcp://broker:55555 --vpn=my-vpn --username=user --password=pass
```

Available options:

- `--images-dir`: Directory containing images (default: 'images')
- `--host`: Solace broker host (default: tcp://localhost:55555)
- `--vpn`: Message VPN name (default: 'default')
- `--username`: Authentication username (default: 'default')
- `--password`: Authentication password (default: 'default')

### Environment Variables

You can also set configuration via environment variables:

- `SOLACE_HOST`: Solace broker host
- `SOLACE_VPN`: Message VPN name
- `SOLACE_USERNAME`: Authentication username
- `SOLACE_PASSWORD`: Authentication password

## Topic Structure

Images are published to topics with the following format:
```
solace/images/{image_filename}
```

## Message Format

Each published message contains:
- Payload: Base64-encoded image data
- Properties:
  - `filename`: Original image filename
  - `content-type`: Image MIME type (e.g., image/jpeg)
  - `encoding`: Always "base64"
  - `application-message-id`: Unique identifier for the image