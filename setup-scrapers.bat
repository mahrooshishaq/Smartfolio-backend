@echo off
echo ==============================================
echo Smartfolio Scraper Environment Setup Script
echo ==============================================
echo.

cd src\scrapers

if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo Failed to create virtual environment. Ensure python is installed and in your PATH.
        exit /b 1
    )
) else (
    echo Virtual environment already exists.
)

echo Activating virtual environment and installing dependencies...
call venv\Scripts\activate
pip install -r requirements.txt
playwright install
echo Setup complete.
cd ..\..
