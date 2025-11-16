# Quick Start: Auto-Update

## ✅ Implementation Complete

Full auto-update support has been successfully integrated into your Electron app!

## 🚀 Quick Test

### Test Manual Update Check

1. **Start the app in development mode**:
   ```powershell
   npm run dev
   ```

2. **Navigate to Settings**:
   - Open the app
   - Click on **Settings** in the sidebar
   - Click the **About** button in the header
   - Scroll to the **Software Updates** card

3. **Click "Check for Updates"**:
   - You'll see status updates
   - In development mode, it won't find updates (expected)
   - The UI will show "You are running the latest version" or an error (normal in dev)

## 📦 Create Your First Release

### Step 1: Update Version

```powershell
npm version patch
# This updates package.json from 2.9.0 to 2.9.1
```

### Step 2: Set GitHub Token

```powershell
$env:GH_TOKEN = "your_github_personal_access_token"
```

**To create a token:**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo` (full control)
4. Copy the token

### Step 3: Build and Publish

```powershell
npm run release
```

This will:
- ✅ Build optimized CSS
- ✅ Create Windows installer (.exe)
- ✅ Generate update metadata (latest.yml)
- ✅ Create GitHub release
- ✅ Upload files automatically

### Step 4: Verify Release

1. Go to: https://github.com/MayuraPatkar/Shresht-Systems_Management-System/releases
2. Check that the release has:
   - ✅ `.exe` installer file
   - ✅ `latest.yml` file (CRITICAL for auto-update)
3. If release is "Draft", click **Publish release**

## 🎯 How It Works

### Automatic Updates (Production)

When users launch the app:
1. App starts normally
2. After 3 seconds, checks for updates in background
3. If update found:
   - Downloads silently
   - Shows notification when ready
   - Prompts to restart and install
4. If no update:
   - Nothing happens (silent)

### Manual Updates (Settings Page)

Users can manually check:
1. Settings → About → Check for Updates
2. Real-time feedback:
   - ⏳ "Checking for updates..."
   - 📥 "Downloading update... 45%"
   - ✅ "Update ready to install"
   - 🎉 "You're on the latest version!"

## 📋 Files Modified

| File | Changes |
|------|---------|
| `main.js` | ✅ Auto-updater configuration, IPC handlers |
| `preload.js` | ✅ Exposed update APIs to renderer |
| `package.json` | ✅ GitHub publish config, build scripts |
| `settings.html` | ✅ Update UI in About section |
| `settings_system.js` | ✅ Update check logic and event handlers |

## 🔍 What Users See

### In Settings (About Section):

**Software Updates Card**
```
┌─────────────────────────────────────────┐
│ 🔄 Software Updates                     │
├─────────────────────────────────────────┤
│ ℹ️ Ready to check for updates           │
│                                         │
│ [Check for Updates]                     │
└─────────────────────────────────────────┘
```

**When Update Available:**
```
┌─────────────────────────────────────────┐
│ 🔄 Software Updates                     │
├─────────────────────────────────────────┤
│ 📥 Downloading update: 67% complete     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ Downloading: 45.2MB / 67.5MB (2.1MB/s)  │
│                                         │
│ ℹ️ Update Details:                      │
│    Version: 2.9.1                       │
│    Release Date: Nov 16, 2025           │
│                                         │
│ [Check for Updates] (disabled)          │
└─────────────────────────────────────────┘
```

**When Update Ready:**
```
┌─────────────────────────────────────────┐
│ 🔄 Software Updates                     │
├─────────────────────────────────────────┤
│ ✅ Update downloaded! Ready to install. │
│                                         │
│ [🚀 Restart and Install Update]         │
│ [Check for Updates]                     │
└─────────────────────────────────────────┘
```

## 🛠️ Build Commands

```powershell
# Development (no auto-update)
npm run dev

# Production build (local only, no publish)
npm run build

# Build and publish to GitHub
npm run release

# Just publish (if already built)
npm run build:publish
```

## 📊 Update Flow Diagram

```
App Starts (Production)
    ↓
Wait 3 seconds
    ↓
Check GitHub for updates
    ↓
    ├─→ No Update → Continue silently
    │
    └─→ Update Found
            ↓
        Download update
            ↓
        Show notification
            ↓
        User chooses:
            ├─→ "Restart Now" → Install immediately
            └─→ "Later" → Install on next app quit
```

## 🐛 Troubleshooting

### "No updates found" (but you just released)

**Causes:**
- Running in development mode (`npm run dev`)
- Version in package.json not higher than installed
- `latest.yml` missing from GitHub release

**Fix:**
- Use `npm start` (production mode)
- Increment version: `npm version patch`
- Re-run `npm run release` to upload all files

### Build fails with "GitHub token required"

**Fix:**
```powershell
$env:GH_TOKEN = "ghp_your_token_here"
npm run release
```

### Update downloads but won't install

**Causes:**
- App doesn't have write permissions
- Antivirus blocking installer

**Fix:**
- Run app as administrator once
- Add exception in antivirus

## 📚 Documentation

- **Full Guide**: See `AUTO_UPDATE_SETUP.md`
- **electron-updater docs**: https://www.electron.build/auto-update
- **GitHub Releases**: https://docs.github.com/en/rest/releases

## ✨ Next Steps

1. **Test locally**: `npm run dev` and check Settings → About
2. **Create test release**: `npm version patch` → `npm run release`
3. **Install old version** and test auto-update
4. **Set up code signing** (optional, for production)

## 🎉 Success Indicators

Your implementation is working if:

- ✅ No errors in console
- ✅ Settings → About shows "Software Updates" card
- ✅ "Check for Updates" button is clickable
- ✅ Status updates appear when checking
- ✅ Build creates `.exe` and `latest.yml` files
- ✅ GitHub releases include both files
- ✅ Older app versions detect new releases

---

**Status**: ✅ Ready to use!  
**Last Updated**: November 16, 2025  
**Version**: 2.9.0
