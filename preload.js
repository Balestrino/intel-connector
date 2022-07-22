const { contextBridge, ipcRenderer } = require('electron')

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency])
  }
})

contextBridge.exposeInMainWorld('electronAPI', {
  setToken: (title) => ipcRenderer.send('setToken', title),
  readFile: () => ipcRenderer.send('readFile')
})

// contextBridge.exposeInMainWorld('readFile', {
//   readFile: () => ipcRenderer.send('readFile')
// })