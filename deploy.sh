#!/bin/bash

# Update system
apt-get update
apt-get upgrade -y

# Install required packages
apt-get install -y python3-pip python3-venv git

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Copy systemd service file
cp telegram-bot.service /etc/systemd/system/

# Reload systemd
systemctl daemon-reload

# Enable and start the service
systemctl enable telegram-bot
systemctl start telegram-bot

# Check service status
systemctl status telegram-bot 