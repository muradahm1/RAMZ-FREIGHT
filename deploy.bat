@echo off
echo ========================================
echo RAMZ-FREIGHT GitHub Deployment
echo ========================================
echo.

echo [1/3] Adding all files...
git add .

echo.
echo [2/3] Committing changes...
set /p message="Enter commit message (or press Enter for default): "
if "%message%"=="" set message=Update: Ready for deployment

git commit -m "%message%"

echo.
echo [3/3] Pushing to GitHub...
git push

echo.
echo ========================================
echo Deployment complete!
echo Your site will be live in 2-3 minutes at:
echo https://muradahm1.github.io/RAMZ-FREIGHT/
echo ========================================
pause
