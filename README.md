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

## Environment Setup

1. [Install Python3](https://www.python.org/downloads/) (See installed version using `python3 -V`)  
   1.1 Note: If you are installing python for the first time on your machine then you can just use `python` instead of `python3` for the commands
1. [Optional] Install virtualenv `python3 -m pip install --user virtualenv` 1.1 Note: on a Linux machine, depending on the distribution you might need to`apt-get install python3-venv`instead 1.2 Alternatively, you can use`pyenv` to manage multiple versions of python. Follow the instructions here for more information https://realpython.com/intro-to-pyenv/#virtual-environments-and-pyenv
1. Clone this repository
1. [Optional] Setup python virtual environment `python3 -m venv venv`
1. [Optional] Activate virtual environment:  
   1.1 MacOS/Linux: `source venv/bin/activate`  
   1.2 Windows: `venv/Scripts/activate`
1. After activating the virtual environment, make sure you have the latest pip installed `pip install --upgrade pip`

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