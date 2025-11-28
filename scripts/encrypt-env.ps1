param(
    [string]$inFile = ".env",
    [string]$outFile = ".env.gpg"
)

if (-not (Test-Path $inFile)) {
    Write-Error "Input file $inFile not found. Create the .env file first or specify another path."
    exit 1
}

if (-not (Get-Command gpg -ErrorAction SilentlyContinue)) {
    Write-Error "gpg not found. Install Gpg4win (https://gpg4win.org/) or GnuPG and retry."
    exit 1
}

Write-Host "Encrypting $inFile -> $outFile (symmetric AES256). You will be prompted for a passphrase."
gpg --batch --yes --symmetric --cipher-algo AES256 -o $outFile $inFile
if ($LASTEXITCODE -ne 0) {
    Write-Error "gpg failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "Created encrypted file: $outFile"
Write-Host "Add $outFile to git and push. Do NOT commit plaintext .env. Share passphrase out-of-band."
