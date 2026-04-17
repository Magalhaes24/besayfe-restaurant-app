#!/usr/bin/env python3
"""
Launcher for the Allergen Normalizer GUI.

This script checks dependencies and launches the GUI application.
"""

import subprocess
import sys
from pathlib import Path

def check_dependencies():
    """Check if all required packages are installed."""
    required_packages = {
        'PySimpleGUI': 'PySimpleGUI',
        'pdfplumber': 'pdfplumber',
        'pandas': 'pandas',
        'openpyxl': 'openpyxl',
    }

    missing = []
    for module, package in required_packages.items():
        try:
            __import__(module)
        except ImportError:
            missing.append(package)

    if missing:
        print("❌ Missing required packages:")
        for package in missing:
            print(f"   - {package}")
        print()
        print("Install them with:")
        print(f"   pip install {' '.join(missing)}")
        print()
        return False

    return True

def main():
    """Launch the GUI application."""
    if not check_dependencies():
        sys.exit(1)

    try:
        from gui import main as gui_main
        gui_main()
    except ImportError as e:
        print(f"❌ Error importing GUI: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error running GUI: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
