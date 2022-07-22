// const { useWindowScroll } = require("@mantine/hooks");

const setButton = document.getElementById('button_token')
const tokenInput = document.getElementById('token')
const buttonReadfile = document.getElementById('button_readfile')

setButton.addEventListener('click', () => {
  const token = tokenInput.value
  window.electronAPI.setToken(token)
});

buttonReadfile.addEventListener('click', () => {
  console.log("btn click")
  window.electronAPI.readFile()
})