const { app, BrowserWindow } = require('electron')

function createWindow() {
  const win = new BrowserWindow({ width: 1200, height: 800 })
  const url = process.env.APP_URL || 'http://localhost:5173'
  win.loadURL(url)
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})



