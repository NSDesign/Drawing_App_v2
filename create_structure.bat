@echo off
echo Creating Modern Drawing App project structure...

:: Create main directory
mkdir modern-drawing-app
cd modern-drawing-app

:: Create all subdirectories
mkdir src
mkdir src\styles
mkdir src\js
mkdir src\js\core
mkdir src\js\shapes
mkdir src\js\renderers
mkdir src\js\tools
mkdir src\js\ui
mkdir src\assets
mkdir src\assets\icons
mkdir dist

echo.
echo Project structure created successfully!
echo.
echo Directory structure:
echo modern-drawing-app/
echo ├── src/
echo │   ├── styles/
echo │   ├── js/
echo │   │   ├── core/
echo │   │   ├── shapes/
echo │   │   ├── renderers/
echo │   │   ├── tools/
echo │   │   └── ui/
echo │   └── assets/
echo │       └── icons/
echo └── dist/
echo.
echo Ready for development!

pause