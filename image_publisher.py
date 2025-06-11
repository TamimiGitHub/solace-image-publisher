#!/usr/bin/env python3

import os
import platform
import time
import base64
import glob
from pathlib import Path
import argparse
from typing import List, Optional

# Import Solace Python API modules from the solace package
from solace.messaging.messaging_service import MessagingService, ReconnectionListener, ReconnectionAttemptListener, ServiceInterruptionListener, RetryStrategy, ServiceEvent
from solace.messaging.resources.topic import Topic
from solace.messaging.publisher.direct_message_publisher import PublishFailureListener, FailedPublishEvent
from solace.messaging.config.transport_security_strategy import TLS

if platform.uname().system == 'Windows':
    os.environ["PYTHONUNBUFFERED"] = "1"  # Disable stdout buffer

# Default topic prefix
TOPIC_PREFIX = "solace/images"

# Global debug flag
DEBUG = False

# Inner classes for error handling
class ServiceEventHandler(ReconnectionListener, ReconnectionAttemptListener, ServiceInterruptionListener):
    def on_reconnected(self, e: ServiceEvent):
        print("\non_reconnected")
        print(f"Error cause: {e.get_cause()}")
        print(f"Message: {e.get_message()}")
    
    def on_reconnecting(self, e: "ServiceEvent"):
        print("\non_reconnecting")
        print(f"Error cause: {e.get_cause()}")
        print(f"Message: {e.get_message()}")

    def on_service_interrupted(self, e: "ServiceEvent"):
        print("\non_service_interrupted")
        print(f"Error cause: {e.get_cause()}")
        print(f"Message: {e.get_message()}")


class PublisherErrorHandling(PublishFailureListener):
    def on_failed_publish(self, e: "FailedPublishEvent"):
        print("on_failed_publish")
        print(f"Error cause: {e.get_cause()}")
        print(f"Message: {e.get_message()}")


def get_image_files(directory: str) -> List[str]:
    """
    Get all image files from the specified directory.
    
    Args:
        directory (str): Path to the directory containing images
        
    Returns:
        List[str]: List of image file paths
    """
    if not os.path.exists(directory):
        print(f"Error: Directory '{directory}' does not exist.")
        return []
    
    # Common image file extensions
    image_extensions = ['*.jpg', '*.jpeg', '*.png', '*.gif', '*.bmp', '*.tiff', '*.webp']
    
    image_files = []
    for ext in image_extensions:
        image_files.extend(glob.glob(os.path.join(directory, ext)))
        image_files.extend(glob.glob(os.path.join(directory, ext.upper())))
    
    if not image_files:
        print(f"No images found in directory '{directory}'.")
    
    return image_files


def read_image_to_base64(image_path: str) -> Optional[str]:
    """
    Read an image file and convert it to base64.
    
    Args:
        image_path (str): Path to the image file
        
    Returns:
        Optional[str]: Base64 encoded string of the image or None if error
    """
    try:
        with open(image_path, 'rb') as image_file:
            binary_data = image_file.read()
            # Standard base64 encoding without line breaks or special characters
            base64_data = base64.b64encode(binary_data).decode('utf-8')
            
            # Validate data format for common image types
            file_ext = os.path.splitext(image_path)[1].lower()
            if file_ext in ['.jpg', '.jpeg']:
                # JPEG base64 should start with /9j/
                if not base64_data.startswith('/9j/'):
                    print(f"Warning: JPEG image {image_path} does not have expected base64 prefix")
            elif file_ext == '.png':
                # PNG base64 should start with iVBORw0K
                if not base64_data.startswith('iVBORw0K'):
                    print(f"Warning: PNG image {image_path} does not have expected base64 prefix")
            
            print(f"Encoded {image_path} - Size: {len(base64_data)} chars")
            return base64_data
    except Exception as e:
        print(f"Error reading image {image_path}: {e}")
        return None


def publish_images(images_dir: str, host: str, vpn: str, username: str, password: str):
    """
    Main function to publish images to Solace broker.
    
    Args:
        images_dir (str): Directory containing images
        host (str): Solace broker host
        vpn (str): Message VPN name
        username (str): Authentication username
        password (str): Authentication password
    """
    # Get all image files
    image_files = get_image_files(images_dir)
    if not image_files:
        return
    
    # Broker Config
    broker_props = {
        "solace.messaging.transport.host": host,
        "solace.messaging.service.vpn-name": vpn,
        "solace.messaging.authentication.scheme.basic.username": username,
        "solace.messaging.authentication.scheme.basic.password": password
    }
    transport_security_strategy = TLS.create().without_certificate_validation()

    # Build messaging service with a reconnection strategy
    messaging_service = MessagingService.builder().from_properties(broker_props)\
                       .with_reconnection_retry_strategy(RetryStrategy.parametrized_retry(20, 3))\
                       .with_transport_security_strategy(transport_security_strategy)\
                       .build()

    # Blocking connect thread
    messaging_service.connect()
    print(f'Messaging Service connected? {messaging_service.is_connected}')

    # Event Handling for the messaging service
    service_handler = ServiceEventHandler()
    messaging_service.add_reconnection_listener(service_handler)
    messaging_service.add_reconnection_attempt_listener(service_handler)
    messaging_service.add_service_interruption_listener(service_handler)

    # Create a direct message publisher and start it
    direct_publisher = messaging_service.create_direct_message_publisher_builder().build()
    direct_publisher.set_publish_failure_listener(PublisherErrorHandling())

    # Blocking Start thread
    direct_publisher.start()
    print(f'Direct Publisher ready? {direct_publisher.is_ready()}')

    try:
        for image_path in image_files:
            # Get image filename without path
            image_filename = os.path.basename(image_path)
            
            # Read and encode the image
            base64_data = read_image_to_base64(image_path)
            if not base64_data:
                continue
            
            # Debug: Output sample of base64 data
            if DEBUG:
                print(f"Base64 data sample (first 50 chars): {base64_data[:50]}...")
                print(f"Base64 data sample (last 50 chars): ...{base64_data[-50:]}")
                
                # Check for common image format markers
                if '/9j/' in base64_data[:100]:
                    print("✓ JPEG marker detected in base64 data")
                elif 'iVBORw0K' in base64_data[:100]:
                    print("✓ PNG marker detected in base64 data")
                else:
                    print("⚠ No standard image format markers detected in the first 100 chars")
            
            # Create topic with image name
            topic = Topic.of(f"{TOPIC_PREFIX}/{image_filename}")
            
            # Prepare outbound message with image data
            outbound_msg_builder = messaging_service.message_builder() \
                .with_application_message_id(f"image-{image_filename}") \
                .with_property("filename", image_filename) \
                .with_property("content-type", "image/" + image_filename.split('.')[-1].lower()) \
                .with_property("encoding", "base64")
            
            # Build the message with base64 data
            outbound_msg = outbound_msg_builder.build(base64_data)
            
            # Publish the message
            direct_publisher.publish(destination=topic, message=outbound_msg)
            print(f'Published image {image_filename} on {topic}')
            
            # Small delay between publishes
            time.sleep(0.1)
            
        print("\nAll images published successfully!")
            
    except KeyboardInterrupt:
        print('\nTerminating Publisher')
    except Exception as e:
        print(f"\nError during publishing: {e}")
    finally:
        print('\nTerminating Publisher')
        direct_publisher.terminate()
        print('\nDisconnecting Messaging Service')
        messaging_service.disconnect()


def main():
    """Main entry point with argument parsing"""
    parser = argparse.ArgumentParser(description='Publish images to Solace broker')
    parser.add_argument('--images-dir', type=str, default='images',
                        help='Directory containing images (default: images)')
    parser.add_argument('--host', type=str, 
                        default=os.environ.get('SOLACE_HOST', 'tcp://localhost:55555'),
                        help='Solace broker host (default: tcp://localhost:55555)')
    parser.add_argument('--vpn', type=str, 
                        default=os.environ.get('SOLACE_VPN', 'default'),
                        help='Message VPN name (default: default)')
    parser.add_argument('--username', type=str, 
                        default=os.environ.get('SOLACE_USERNAME', 'default'),
                        help='Authentication username (default: default)')
    parser.add_argument('--password', type=str, 
                        default=os.environ.get('SOLACE_PASSWORD', 'default'),
                        help='Authentication password (default: default)')
    parser.add_argument('--debug', action='store_true',
                        help='Enable debug mode to print base64 encoding details')
    
    args = parser.parse_args()
    
    # Set global debug flag
    global DEBUG
    DEBUG = args.debug
    
    # Create images directory if it doesn't exist
    if not os.path.exists(args.images_dir):
        print(f"Creating images directory: {args.images_dir}")
        os.makedirs(args.images_dir)
        print(f"Please add image files to the '{args.images_dir}' directory and run the script again.")
        return
    
    publish_images(args.images_dir, args.host, args.vpn, args.username, args.password)


if __name__ == "__main__":
    main()
