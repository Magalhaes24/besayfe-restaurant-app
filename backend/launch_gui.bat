@echo off
REM Allergen Normalizer GUI Launcher for Windows
REM
REM This batch file launches the GUI application.
REM It automatically activates the Python environment if needed.

setlocal enabledelayedexpansion

echo.
echo ====================================
echo  Allergen Normalizer GUI Launcher
echo ====================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python is not installed or not in PATH.
    echo Please install Python and add it to your PATH.
    pause
    exit /b 1
)

REM Check if we're in the backend directory
if not exist "gui.py" (
    echo Error: gui.py not found in current directory.
    echo Please run this script from the backend/ directory.
    pause
    exit /b 1
)

REM Install/update dependencies
echo Checking dependencies...
pip install -q -r requirements.txt
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies.
    echo Check your internet connection or requirements.txt
    pause
    exit /b 1
)

REM Launch the GUI
echo Starting Allergen Normalizer GUI...
echo.
python launch_gui.py
if %errorlevel% neq 0 (
    echo.
    echo Error: GUI failed to start.
    pause
    exit /b 1
)

endlocal
