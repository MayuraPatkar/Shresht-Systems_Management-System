param(
    [string]$inFile = ".env.gpg",
    [string]$outFile = ".env"
)

if (-not (Test-Path $inFile)) {
    Write-Error "Encrypted file $inFile not found."
    exit 1
}

if (-not (Get-Command gpg -ErrorAction SilentlyContinue)) {
    Write-Error "gpg not found. Install Gpg4win (https://gpg4win.org/) or GnuPG and retry."
    exit 1
}

Write-Host "Decrypting $inFile -> $outFile. You will be prompted for the passphrase."
gpg --output $outFile --decrypt $inFile
if ($LASTEXITCODE -ne 0) {
    Write-Error "gpg failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "Decrypted file: $outFile"
