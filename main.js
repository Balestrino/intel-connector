const { app, BrowserWindow, ipcMain, net } = require('electron')
const path = require('path')
const fs = require('fs')
const readLastLines = require('read-last-lines')
const queryString = require('query-string');

const systems = require("./systems.json")
const systems_name_array = systems.map(item => (item.name).toLowerCase())

let userData = []
let chatLogs = []

try {
  require('electron-reloader')(module)
} catch (_) { }

const createWindow = () => {
  const win = new BrowserWindow({
    width: 600,
    height: 300,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  ipcMain.on('setToken', (event, data) => {
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)
    win.setTitle(data)
    console.log(`Token: ${data}`)

    const request = net.request(`https://sso.eveonline.it/map/chars?uuid=${data}`)

    request.on('response', (response) => {
      const data = []
      response.on("data", (chunk) => {
        data.push(chunk)
      })
      response.on("end", () => {
        const json = Buffer.concat(data).toString()
        console.log(json)
        userData = JSON.parse(json)
      })
    })

    request.end()

  })

  ipcMain.on('readFile', (event, data) => {
    console.log("reading files")

    const dirPath = 'C:\\Users\\tore\\Documents\\EVE\\logs\\Chatlogs'

    // ** get unique name chats
    const allChats = getUniqueChats(dirPath)
    let uniqueChats = [...new Set(allChats)];
    // console.log(uniqueChats)

    // ** filter channels
    const filters = ["wc", "intel"]

    const filteredChat = uniqueChats.filter(chat => String(chat).startsWith(filters[0]))

    console.log(filteredChat)

    // ** scan directory for the last chatlogs (filtered)

    // const filenames = fs.readdirSync(dirPath)
    const chatToScan = []
    for (let i = 0; i < filteredChat.length; i++) {
      const files = getDirectories(dirPath, filteredChat[i]);
      const lastModified = files.sort((a, b) => b.modified - a.modified);

      // console.log(`${filteredChat[i]}\nLast modified:\n`)
      // console.log(lastModified[0])
      chatToScan.push(lastModified[0].name)
      // * build global chatLogs
      chatLogs.push({ chatName: lastModified[0].name, last: "" })
    }

    console.log("chatToScan: ", chatToScan)
    console.log("chatLogs: ", chatLogs)
    scanChats(chatToScan, dirPath);
    // scanChats(chatToScan, dirPath)

    return

    // console.log(filenames)
    for (let i = 0; i < filenames.length; i++) {
      if (filenames[i].startsWith('wc')) {
        const reversedUserId = "661916654".split("").reverse().join("");

        const reversedString = filenames[i].split("").reverse().join("");

        var userIdChat = reversedString.substring(
          reversedString.indexOf(".") + 1,
          reversedString.indexOf("_")
        );
        // console.log(`userid: ${userIdChat} | ${reversedString}`)
        if (userIdChat == reversedUserId) console.log(filenames[i])
      }
    }

  })

})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ------------------------------------

const scanChats = (chatToScan, dirPath) => {
  console.log("Scanning chats...")


  for (let i = 0; i < chatToScan.length; i++) {
    const fullPath = `${dirPath}\\${chatToScan[i]}`
    // console.log(fullPath)
    readLastLines.read(fullPath, 2)
      .then((line) => {
        const lines = line.split(/\r\n|\r|\n/);
        // console.log("lines: ", lines.length)

        const last_intel = lines[0].replace(/[^a-z0-9-.\[\] ]/gi, '')
        // console.log(`Last intel: ${last_intel}`)

        let chat = chatLogs.find(obj => obj.chatName === chatToScan[i])
        // console.log("Old intel: ", chat.last)

        if (chat.last.localeCompare(last_intel)) {
          chat.last = last_intel
          // console.log(decodeURIComponent(chat.last))
          apiSend(last_intel)
        }
      })
  }
  // console.log("chatLogs: ", chatLogs)
  setTimeout(scanChats, 10000, chatToScan, dirPath);
}

// ** Send data to api.eveonline.it
const apiSend = (str) => {

  // let arr = []
  // arr.push(str.toLowerCase())

  const data = str.toLowerCase()
  console.log("Parsing: ", data)

  // const asd = " ´┐¢´┐¢[ 2022.07.22 16:30:13 ] black dharma > g5ed-y asd"
  // console.log(data.toString().indexOf(`g5ed-y`))
  // if (qwe.includes(`g5ed-y`) >= 0) {
  //   console.log("FOUND!")
  // }

  for (let i = 0; i < systems_name_array.length; i++) {

    const systemName = systems_name_array[i]

    if (data.includes(systemName)) {
      const sysObj = systems.find(e => e.name === systemName)
      console.log(`!BINGO! found ${systemName} as system_id: ${sysObj.system_id} ${sysObj.name}`)

      var postData = queryString.stringify({
        system: sysObj.system_id,
        // string: encodeURIComponent(string)
        string: data
      });

      const request = net.request({
        method: 'POST',
        url: 'https://api.eveonline.it/v1/map/upstream'
      })

      request.on('response', (response) => {
        console.log(`STATUS: ${response.statusCode}`)
        // console.log(`HEADERS: ${JSON.stringify(response.headers)}`)
      })
      request.setHeader('Content-Type', 'application/x-www-form-urlencoded');
      request.write(postData, 'utf-8')
      request.end()

      break
    }
  }

}

const getUniqueChats = (dirPath) => {
  const dirs = []

  fs.readdirSync(dirPath).map(file => {
    const reversedFilename = file.split("").reverse().join("");
    const reversedChat = reversedFilename.substring(
      reversedFilename.indexOf("_") + 17
    );
    const chatName = reversedChat.split("").reverse().join("");
    dirs.push(chatName)
  })

  // console.log(dirs)
  return dirs
}


const getDirectories = (dirPath, filter) => {

  const files = [];

  function getFiles(dir, filter) {

    fs.readdirSync(dir).map(file => {

      const absolutePath = path.join(dir, file);

      const stats = fs.statSync(absolutePath);

      if (fs.statSync(absolutePath).isDirectory()) {

        return getFiles(absolutePath);

      } else {
        const modified = {
          name: file,
          dir: dir,
          created: stats.birthtime.toLocaleString('en-GB', { timeZone: 'UTC' }),
          modified: stats.mtime
        };
        if ((modified.name).startsWith(filter)) return files.push(modified);
      }
    });
  }

  getFiles(dirPath, filter);
  return files;
}

