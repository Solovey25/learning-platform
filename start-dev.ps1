$env:DATABASE_URL="postgresql://postgres:postgres@localhost/eduplatform"
$env:SECRET_KEY="change_me_to_random_string"
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="ChangeThisAdminPassword123"

Start-Process -FilePath "python" -ArgumentList "main.py" -WorkingDirectory "backend"

cd front
if (-not (Test-Path "node_modules")) {
    npm install
}
npm run dev
