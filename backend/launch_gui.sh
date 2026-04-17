#!/bin/bash

# Allergen Normalizer GUI Launcher for macOS/Linux
#
# Usage: bash launch_gui.sh
#        chmod +x launch_gui.sh && ./launch_gui.sh

set -e

echo ""
echo "===================================="
echo "  Allergen Normalizer GUI Launcher"
echo "===================================="
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed."
    echo ""
    echo "Install Python with:"
    echo "  macOS: brew install python3"
    echo "  Linux: sudo apt-get install python3 python3-pip"
    exit 1
fi

echo "✓ Python found: $(python3 --version)"

# Check if we're in the backend directory
if [ ! -f "gui.py" ]; then
    echo "❌ Error: gui.py not found in current directory."
    echo "Please run this script from the backend/ directory."
    exit 1
fi

# Install/update dependencies
echo ""
echo "📦 Installing dependencies..."
pip3 install -q -r requirements.txt
if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to install dependencies."
    echo "Check your internet connection or requirements.txt"
    exit 1
fi
echo "✓ Dependencies installed"

# Launch the GUI
echo ""
echo "🚀 Starting Allergen Normalizer GUI..."
echo ""
python3 launch_gui.py

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Error: GUI failed to start."
    exit 1
fi
