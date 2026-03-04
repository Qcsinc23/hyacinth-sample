# Hyacinth Sample - Setup Guide

## ✅ Setup complete

- **Node.js LTS** installed (via winget)
- **Project dependencies** installed (`npm install --ignore-scripts` then native modules built)
- **Windows-compatible start scripts** added (replaced Unix `env` with `cross-env` and `.erb/scripts/run-electron.js` so the app starts correctly from Cursor/VS Code)

Project location:
```
c:\Users\S. GRAHAM\Development\hyacinth-sample
```

## 🚀 Run the app

From a terminal (prefer a **new** PowerShell or Command Prompt so PATH includes Node):

```powershell
cd "c:\Users\S. GRAHAM\Development\hyacinth-sample"
npm start
```

The first run may take 30–60 seconds (webpack builds). The Hyacinth window should then open.

## 📝 Available Commands

- `npm start` - Start the app in development mode
- `npm test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests with Playwright
- `npm run lint` - Check code style
- `npm run build` - Build for production
- `npm run package` - Package the app for your platform
- `npm run package:win` - Package Windows installer (NSIS + ZIP)

## 🏗️ Project Structure

- `src/main` - Electron main process (IPC handlers, app lifecycle)
- `src/renderer` - React UI components
- `src/shared` - Shared TypeScript types and IPC channel definitions
- `e2e/` - Playwright end-to-end tests
- `docs/` - Documentation (HIPAA, security, etc.)

## 🐛 Troubleshooting

### If npm install fails:
1. Make sure you have Node.js >= 14.x installed
2. Try clearing npm cache: `npm cache clean --force`
3. Delete `node_modules` folder and `package-lock.json`, then run `npm install` again

### If the app won't start:
1. Check that port 1212 is not in use (the dev server uses this port)
2. Make sure all dependencies installed correctly
3. Check the console for error messages

## 📚 Additional Resources

- See `README.md` for more detailed information
- Check `IMPLEMENTATION_SUMMARY.md` for feature overview
- Review `QUICK_DISPENSE_IMPLEMENTATION.md` for quick dispense details

## 🎯 Next Steps

1. Install Node.js from https://nodejs.org/
2. Restart your terminal/PowerShell
3. Run `npm install` in the project directory
4. Run `npm start` to launch the app

Happy coding! 🚀
