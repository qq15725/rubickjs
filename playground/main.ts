import { Assets, Canvas, Label, Sprite } from 'rubickjs'

const canvas = new Canvas({
  background: '#1099bb',
})

canvas.observe()
const view = canvas.view!
view.style.width = '100vw'
view.style.height = '100vh'
document.body.append(view)

const text = new Label('Hello, World!', {
  fontSize: 22,
  color: 'red',
  textDecoration: 'underline',
})
text.on('process', (delta: number) => {
  text.x = 100
  text.y = 100
  text.rotation += 0.005 * delta
})
canvas.addChild(text)

const bunny = new Sprite(Assets.load('https://pixijs.com/assets/bunny.png'))
bunny.on('process', (delta: number) => {
  bunny.x = canvas.width / 2 - bunny.width / 2
  bunny.y = canvas.height / 2 - bunny.height / 2
  bunny.rotation += 0.001 * delta
})
canvas.addChild(bunny)
canvas.start()
